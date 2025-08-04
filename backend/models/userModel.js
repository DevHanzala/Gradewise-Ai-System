import pool from "../DB/db.js" // Import the database pool

/**
 * Creates the 'users' table if it does not already exist.
 * Updated to include provider and uid fields for Google/manual authentication.
 */
export const createUserTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255), -- Nullable for Google users
      role VARCHAR(50) NOT NULL DEFAULT 'student', -- Default role is student
      verified BOOLEAN DEFAULT FALSE, -- Email verification status
      verification_token VARCHAR(255), -- Token for email verification
      reset_token VARCHAR(255), -- Token for password reset
      reset_token_expires TIMESTAMP, -- Expiration time for reset token
      provider VARCHAR(50) DEFAULT 'manual', -- 'manual' or 'google'
      uid VARCHAR(255) UNIQUE, -- Google UID or other provider UID
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
    CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `
  try {
    await pool.query(query)
    console.log("Users table checked/created successfully.")
  } catch (err) {
    console.error("Error creating users table:", err.message)
  }
}

/**
 * Finds a user by their email address.
 * @param {string} email - The email of the user to find.
 * @returns {Promise<Object|undefined>} The user object if found, otherwise undefined.
 */
export const findUserByEmail = async (email) => {
  const query = "SELECT * FROM users WHERE email = $1"
  const { rows } = await pool.query(query, [email])
  return rows[0]
}

/**
 * Finds a user by their UID (Google ID or other provider ID).
 * @param {string} uid - The UID of the user to find.
 * @returns {Promise<Object|undefined>} The user object if found, otherwise undefined.
 */
export const findUserByUID = async (uid) => {
  const query = "SELECT * FROM users WHERE uid = $1"
  const { rows } = await pool.query(query, [uid])
  return rows[0]
}

/**
 * Finds a user by their verification token.
 * @param {string} token - The verification token.
 * @returns {Promise<Object|undefined>} The user object if found, otherwise undefined.
 */
export const findUserByVerificationToken = async (token) => {
  const query = "SELECT * FROM users WHERE verification_token = $1"
  const { rows } = await pool.query(query, [token])
  return rows[0]
}

/**
 * Finds a user by their reset token and checks if it's not expired.
 * @param {string} token - The reset token.
 * @returns {Promise<Object|undefined>} The user object if found and token is valid, otherwise undefined.
 */
export const findUserByResetToken = async (token) => {
  const query = "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()"
  const { rows } = await pool.query(query, [token])
  return rows[0]
}

/**
 * Creates a new user in the database (manual signup).
 * @param {string} name - The name of the user.
 * @param {string} email - The email of the user (must be unique).
 * @param {string} password - The hashed password of the user.
 * @param {string} [role='student'] - The role of the user. Defaults to 'student'.
 * @param {string} verificationToken - The verification token for email verification.
 * @param {string} [provider='manual'] - The authentication provider.
 * @param {string} [uid=null] - The provider UID.
 * @returns {Promise<Object>} The newly created user object (excluding the password).
 */
export const createUser = async (
  name,
  email,
  password,
  role = "student",
  verificationToken,
  provider = "manual",
  uid = null,
) => {
  const query = `
    INSERT INTO users (name, email, password, role, verified, verification_token, provider, uid) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING id, name, email, role, verified, provider, uid, created_at
  `

  // New users should always start as unverified (false) with a verification token for manual signup
  const verified = provider === "google" ? true : false
  const { rows } = await pool.query(query, [name, email, password, role, verified, verificationToken, provider, uid])
  return rows[0]
}

/**
 * Creates a new Google user in the database.
 * @param {string} name - The name of the user.
 * @param {string} email - The email of the user (must be unique).
 * @param {string} uid - The Google UID of the user.
 * @param {string} [role='student'] - The role of the user. Defaults to 'student'.
 * @returns {Promise<Object>} The newly created user object.
 */
export const createGoogleUser = async (name, email, uid, role = "student") => {
  const query = `
    INSERT INTO users (name, email, role, verified, provider, uid) 
    VALUES ($1, $2, $3, TRUE, 'google', $4) 
    RETURNING id, name, email, role, verified, provider, uid, created_at
  `

  const { rows } = await pool.query(query, [name, email, role, uid])
  return rows[0]
}

/**
 * Verifies a user's email by updating the verified status and clearing the verification token.
 * @param {string} token - The verification token.
 * @returns {Promise<Object|undefined>} The updated user object if verification is successful.
 */
export const verifyUser = async (token) => {
  const query =
    "UPDATE users SET verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id, name, email, role, verified"
  const { rows } = await pool.query(query, [token])
  return rows[0]
}

/**
 * Finds a verified user who might have used this token recently.
 * This helps provide better UX when users click verification links multiple times.
 * @param {string} email - The email to search for.
 * @returns {Promise<Object|undefined>} The user object if found and verified.
 */
export const findVerifiedUserByEmail = async (email) => {
  const query = "SELECT id, name, email, role, verified, created_at FROM users WHERE email = $1 AND verified = TRUE"
  const { rows } = await pool.query(query, [email])
  return rows[0]
}

/**
 * Gets all recently verified users (for checking if a token was recently used).
 * @returns {Promise<Array>} Array of recently verified users.
 */
export const getRecentlyVerifiedUsers = async () => {
  const query = `
    SELECT id, name, email, role, verified, created_at 
    FROM users 
    WHERE verified = TRUE 
    AND verification_token IS NULL 
    AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
  `
  const { rows } = await pool.query(query)
  return rows
}

/**
 * Updates a user's reset token and expiration time.
 * @param {string} email - The user's email.
 * @param {string} resetToken - The reset token.
 * @param {Date} expiresAt - The expiration time for the reset token.
 * @returns {Promise<Object|undefined>} The updated user object.
 */
export const updateResetToken = async (email, resetToken, expiresAt) => {
  const query = "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3 RETURNING id, name, email"
  const { rows } = await pool.query(query, [resetToken, expiresAt, email])
  return rows[0]
}

/**
 * Updates a user's password and clears the reset token.
 * @param {string} token - The reset token.
 * @param {string} newPassword - The new hashed password.
 * @returns {Promise<Object|undefined>} The updated user object.
 */
export const updatePassword = async (token, newPassword) => {
  const query =
    "UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2 RETURNING id, name, email"
  const { rows } = await pool.query(query, [newPassword, token])
  return rows[0]
}

/**
 * Gets all users based on role restrictions.
 * Super Admin can see all users except other super_admins, Admin can see students and instructors only.
 * @param {string} requestingUserRole - The role of the user making the request.
 * @returns {Promise<Array>} Array of users (excluding passwords).
 */
export const getAllUsers = async (requestingUserRole = null) => {
  let query = "SELECT id, name, email, role, verified, provider, uid, created_at FROM users"

  if (requestingUserRole === "admin") {
    // Admin can only see students and instructors
    query += " WHERE role IN ('student', 'instructor')"
  } else if (requestingUserRole === "super_admin") {
    // Super Admin can see all users except other super_admins
    query += " WHERE role != 'super_admin'"
  } else {
    // Other roles shouldn't access this, but if they do, show nothing
    query += " WHERE 1=0"
  }

  query += " ORDER BY created_at DESC"

  const { rows } = await pool.query(query)
  return rows
}

/**
 * Updates a user's role with strict restrictions based on requesting user's role.
 * @param {number} userId - The user's ID.
 * @param {string} newRole - The new role.
 * @param {string} requestingUserRole - The role of the user making the request.
 * @returns {Promise<Object|undefined>} The updated user object.
 */
export const updateUserRole = async (userId, newRole, requestingUserRole) => {
  // Get current user data first
  const currentUserQuery = "SELECT * FROM users WHERE id = $1"
  const { rows: currentUserRows } = await pool.query(currentUserQuery, [userId])

  if (!currentUserRows[0]) {
    throw new Error("User not found")
  }

  const currentUser = currentUserRows[0]
  const currentRole = currentUser.role

  // Prevent changing super_admin role
  if (currentRole === "super_admin") {
    throw new Error("Cannot change Super Admin role")
  }

  // Role change restrictions based on requesting user's role
  if (requestingUserRole === "super_admin") {
    // Super Admin can only change student → admin
    if (currentRole === "student" && newRole === "admin") {
      // Allowed
    } else if (currentRole === "admin" && newRole === "student") {
      // Allowed (demote admin to student)
    } else {
      throw new Error("Super Admin can only promote students to admin or demote admins to student")
    }
  } else if (requestingUserRole === "admin") {
    // Admin can only change between student and instructor
    if (
      (currentRole === "student" && newRole === "instructor") ||
      (currentRole === "instructor" && newRole === "student")
    ) {
      // Allowed
    } else {
      throw new Error("Admins can only change between student and instructor roles")
    }
  } else {
    throw new Error("Insufficient permissions to change user roles")
  }

  // Prevent creating additional super_admins
  if (newRole === "super_admin") {
    throw new Error("Cannot create additional Super Admins")
  }

  const query = "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, verified"
  const { rows } = await pool.query(query, [newRole, userId])
  return rows[0]
}

/**
 * Deletes a user (Super Admin only, and only for admin users).
 * @param {number} userId - The user's ID to delete.
 * @param {string} requestingUserRole - The role of the user making the request.
 * @returns {Promise<Object|undefined>} The deleted user object.
 */
export const deleteUser = async (userId, requestingUserRole) => {
  if (requestingUserRole !== "super_admin") {
    throw new Error("Only Super Admin can delete users")
  }

  // Check if the user to be deleted exists and get their role
  const checkQuery = "SELECT * FROM users WHERE id = $1"
  const { rows: userToDelete } = await pool.query(checkQuery, [userId])

  if (!userToDelete[0]) {
    throw new Error("User not found")
  }

  if (userToDelete[0].role === "super_admin") {
    throw new Error("Cannot delete Super Admin")
  }

  if (userToDelete[0].role !== "admin") {
    throw new Error("Can only delete admin users")
  }

  const deleteQuery = "DELETE FROM users WHERE id = $1 RETURNING id, name, email, role"
  const { rows } = await pool.query(deleteQuery, [userId])
  return rows[0]
}

/**
 * Updates existing users to add verification tokens if they don't have one.
 * This is for users created before the verification system was implemented.
 */
export const addVerificationTokenToExistingUsers = async () => {
  const query = `
    UPDATE users 
    SET verification_token = $1, verified = FALSE 
    WHERE verification_token IS NULL AND verified IS NULL
    RETURNING id, email, name
  `
  try {
    const crypto = await import("crypto")
    const token = crypto.randomBytes(32).toString("hex")
    const { rows } = await pool.query(query, [token])
    return rows
  } catch (err) {
    console.error("Error updating existing users:", err.message)
    return []
  }
}

/**
 * Sets existing users as verified (for users created before verification system).
 * Call this once to verify existing users in your database.
 */
export const verifyExistingUsers = async () => {
  const query = `
    UPDATE users 
    SET verified = TRUE, verification_token = NULL 
    WHERE verified IS NULL OR verified = FALSE
    RETURNING id, email, name
  `
  try {
    const { rows } = await pool.query(query)
    console.log(`Verified ${rows.length} existing users`)
    return rows
  } catch (err) {
    console.error("Error verifying existing users:", err.message)
    return []
  }
}
