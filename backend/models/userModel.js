import pool from "../DB/db.js"

/**
 * Create a new user (manual registration)
 */
export const createUserTable = async (name, email, hashedPassword, role, verificationToken, provider, uid) => {
  try {
    const query = `
      INSERT INTO users (name, email, password, role, verified, verification_token, provider, uid, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, email, role, verified, provider, uid, created_at
    `

    const values = [name, email, hashedPassword, role, false, verificationToken, provider, uid]
    const result = await pool.query(query, values)

    return result.rows[0]
  } catch (error) {
    if (error.code === "23505") {
      throw new Error("User with this email already exists")
    }
    throw error
  }
}

/**
 * Create a Google user
 */
export const createGoogleUser = async (name, email, uid, role) => {
  try {
    const query = `
      INSERT INTO users (name, email, role, verified, provider, uid, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, name, email, role, verified, provider, uid, created_at
    `

    const values = [name, email, role, true, "google", uid]
    const result = await pool.query(query, values)

    return result.rows[0]
  } catch (error) {
    if (error.code === "23505") {
      throw new Error("User with this email already exists")
    }
    throw error
  }
}

/**
 * Find user by email
 */
export const findUserByEmail = async (email) => {
  try {
    const query = "SELECT * FROM users WHERE email = $1"
    const result = await pool.query(query, [email])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Get user by email (alias for findUserByEmail)
 */
export const getUserByEmail = async (email) => {
  try {
    const query = "SELECT * FROM users WHERE email = $1"
    const result = await pool.query(query, [email])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Find user by UID
 */
export const findUserByUID = async (uid) => {
  try {
    const query = "SELECT * FROM users WHERE uid = $1"
    const result = await pool.query(query, [uid])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Find user by verification token
 */
export const findUserByVerificationToken = async (token) => {
  try {
    const query = "SELECT * FROM users WHERE verification_token = $1"
    const result = await pool.query(query, [token])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Find user by reset token
 */
export const findUserByResetToken = async (token) => {
  try {
    const query = "SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()"
    const result = await pool.query(query, [token])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Verify user by token
 */
export const verifyUser = async (token) => {
  try {
    const query = `
      UPDATE users 
      SET verified = true, verification_token = NULL, updated_at = NOW() 
      WHERE verification_token = $1 
      RETURNING id, name, email, role, verified
    `
    const result = await pool.query(query, [token])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Update reset token
 */
export const updateResetToken = async (email, resetToken, expiresAt) => {
  try {
    const query = `
      UPDATE users 
      SET reset_token = $1, reset_token_expires = $2, updated_at = NOW() 
      WHERE email = $3 
      RETURNING id, name, email
    `
    const result = await pool.query(query, [resetToken, expiresAt, email])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Update password
 */
export const updatePassword = async (token, hashedPassword) => {
  try {
    const query = `
      UPDATE users 
      SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() 
      WHERE reset_token = $2 AND reset_token_expires > NOW()
      RETURNING id, name, email, role
    `
    const result = await pool.query(query, [hashedPassword, token])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (requestingUserRole) => {
  try {
    if (!["admin", "super_admin"].includes(requestingUserRole)) {
      throw new Error("Insufficient permissions to view all users")
    }

    const query = `
      SELECT id, name, email, role, verified, created_at 
      FROM users 
      ORDER BY created_at DESC
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    throw error
  }
}

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (userId, newRole, requestingUserRole) => {
  try {
    if (requestingUserRole !== "super_admin" && requestingUserRole !== "admin") {
      throw new Error("Insufficient permissions to change user roles")
    }

    if (requestingUserRole === "admin" && ["admin", "super_admin"].includes(newRole)) {
      throw new Error("Admin users cannot promote users to admin or super admin roles")
    }

    const query = `
      UPDATE users 
      SET role = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, name, email, role, verified
    `
    const result = await pool.query(query, [newRole, userId])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Delete user (super admin only)
 */
export const deleteUser = async (userId, requestingUserRole) => {
  try {
    if (requestingUserRole !== "super_admin") {
      throw new Error("Only super admins can delete users")
    }

    const query = "DELETE FROM users WHERE id = $1 RETURNING id, name, email"
    const result = await pool.query(query, [userId])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Get recently verified users
 */
export const getRecentlyVerifiedUsers = async () => {
  try {
    const query = `
      SELECT id, name, email, role, verified, created_at 
      FROM users 
      WHERE verified = true AND verification_token IS NULL
      AND updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY updated_at DESC
      LIMIT 5
    `
    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    throw error
  }
}

/**
 * Find user by ID
 */
export const getUserById = async (id) => {
  try {
    const query = "SELECT id, name, email, role, verified, provider, uid, created_at FROM users WHERE id = $1"
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Get users by role
 */
export const getUsersByRole = async (role) => {
  try {
    const query = `
      SELECT id, name, email, role, verified, created_at 
      FROM users 
      WHERE role = $1 
      ORDER BY name ASC
    `
    const result = await pool.query(query, [role])
    return result.rows
  } catch (error) {
    throw error
  }
}

/**
 * Search users by name or email
 */
export const searchUsers = async (searchTerm) => {
  try {
    const query = `
      SELECT id, name, email, role, verified, created_at 
      FROM users 
      WHERE name ILIKE $1 OR email ILIKE $1 
      ORDER BY name ASC
    `
    const result = await pool.query(query, [`%${searchTerm}%`])
    return result.rows
  } catch (error) {
    throw error
  }
}

/**
 * Check if user exists by email
 */
export const userExistsByEmail = async (email) => {
  try {
    const query = "SELECT id FROM users WHERE email = $1"
    const result = await pool.query(query, [email])
    return result.rows.length > 0
  } catch (error) {
    throw error
  }
}

/**
 * Get user stats (admin dashboard)
 */
export const getUserStats = async () => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
        COUNT(CASE WHEN role = 'instructor' THEN 1 END) as total_instructors,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN verified = false THEN 1 END) as unverified_users
      FROM users
    `
    const result = await pool.query(query)
    return result.rows[0]
  } catch (error) {
    throw error
  }
}
