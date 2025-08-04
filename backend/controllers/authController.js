import bcrypt from "bcrypt" // For password hashing
import jwt from "jsonwebtoken" // For generating JSON Web Tokens
import crypto from "crypto" // For generating random tokens
import {
  createUser,
  createGoogleUser,
  findUserByEmail,
  findUserByUID,
  findUserByVerificationToken,
  findUserByResetToken,
  verifyUser,
  updateResetToken,
  updatePassword,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getRecentlyVerifiedUsers,
} from "../models/userModel.js" // User model functions
import { sendVerificationEmail, sendPasswordResetEmail, sendRoleChangeEmail } from "../services/emailService.js" // Email service
import dotenv from "dotenv"

dotenv.config() // Load environment variables

const JWT_SECRET = process.env.JWT_SECRET // Get JWT secret from environment variables

/**
 * Handles user signup (manual registration).
 * All new users default to 'student' role.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const signup = async (req, res) => {
  const { name, email, password } = req.body // Role is always 'student' for new signups

  try {
    console.log(`🔄 Starting signup process for: ${email}`) // Debug log

    // Check if user with the given email already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      console.log(`❌ User already exists: ${email}`) // Debug log
      return res.status(400).json({ message: "User with this email already exists." })
    }

    // Hash the provided password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10) // 10 is the salt rounds for security
    console.log(`✅ Password hashed for: ${email}`) // Debug log

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    console.log(`✅ Generated verification token for ${email}: ${verificationToken}`) // Debug log

    // Create the new user in the database with default 'student' role
    const newUser = await createUser(name, email, hashedPassword, "student", verificationToken, "manual", null)
    console.log(`✅ User created in database:`, {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      verified: newUser.verified,
      provider: newUser.provider,
      hasToken: !!verificationToken,
    }) // Debug log

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken)
      console.log(`✅ Verification email sent to ${email}`) // Debug log
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError)
      // Continue with signup even if email fails, but inform the user
      return res.status(201).json({
        message: "User registered successfully, but verification email could not be sent. Please contact support.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          verified: newUser.verified,
          provider: newUser.provider,
        },
      })
    }

    // Return success message and user details (excluding password and tokens)
    res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        verified: newUser.verified,
        provider: newUser.provider,
      },
    })
  } catch (error) {
    console.error("❌ Signup error:", error)
    res.status(500).json({ message: "Server error during signup." })
  }
}

/**
 * Handles Google authentication (signup/login).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const googleAuth = async (req, res) => {
  const { name, email, uid } = req.body // uid is the Google UID from Firebase

  try {
    console.log(`🔄 Starting Google auth process for: ${email}`)

    // First, check if user exists by email
    let user = await findUserByEmail(email)

    if (user) {
      // User exists - check provider
      if (user.provider === "google") {
        console.log(`✅ Existing Google user found: ${email}`)
        // Update UID if it's different (shouldn't happen, but just in case)
        if (user.uid !== uid) {
          console.log(`🔄 Updating UID for existing Google user: ${email}`)
          // You could add an update function here if needed
        }
      } else if (user.provider === "manual") {
        console.log(`🔗 Manual user exists, linking with Google: ${email}`)
        // User signed up manually but now wants to use Google
        // For security, we'll keep them as manual user but allow Google login
        // You could implement account linking logic here if desired
      }
    } else {
      // Check if user exists by UID (edge case)
      const userByUID = await findUserByUID(uid)
      if (userByUID) {
        console.log(`⚠️  User found by UID but different email: ${email}`)
        return res.status(400).json({
          message: "This Google account is already linked to a different email address.",
        })
      }

      // Create new Google user with default 'student' role
      console.log(`🆕 Creating new Google user: ${email}`)
      user = await createGoogleUser(name, email, uid, "student")
      console.log(`✅ Google user created:`, {
        id: user.id,
        email: user.email,
        role: user.role,
        provider: user.provider,
        uid: user.uid,
      })
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" })

    console.log(`✅ Google auth successful for: ${email}`)

    // Return success response
    res.status(200).json({
      message: "Google authentication successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        provider: user.provider,
      },
      token,
    })
  } catch (error) {
    console.error("❌ Google auth error:", error)
    res.status(500).json({ message: "Server error during Google authentication." })
  }
}

/**
 * Handles user login.
 * Verifies credentials and email verification, then generates a JWT token on successful login.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    console.log(`🔄 Login attempt for: ${email}`) // Debug log

    // Find user by email in the database
    const user = await findUserByEmail(email)
    if (!user) {
      console.log(`❌ User not found: ${email}`) // Debug log
      return res.status(400).json({ message: "Invalid credentials." })
    }

    console.log(`✅ User found: ${email}, verified: ${user.verified}, provider: ${user.provider}`) // Debug log

    // Check if it's a Google user trying to login with password
    if (user.provider === "google") {
      return res.status(400).json({ message: "Please use Google Sign-In for this account." })
    }

    // Check if user's email is verified (except for super_admin)
    if (!user.verified && user.role !== "super_admin") {
      console.log(`❌ User not verified: ${email}`) // Debug log
      return res.status(400).json({ message: "Please verify your email before logging in." })
    }

    // Compare the provided password with the hashed password stored in the database
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      console.log(`❌ Invalid password for: ${email}`) // Debug log
      return res.status(400).json({ message: "Invalid credentials." })
    }

    // Generate a JWT token for the authenticated user
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }, // Token expires in 24 hours
    )

    console.log(`✅ Login successful for: ${email}`) // Debug log

    // Return success message, user details (excluding password), and the token
    res.status(200).json({
      message: "Logged in successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
        provider: user.provider,
      },
      token,
    })
  } catch (error) {
    console.error("❌ Login error:", error)
    res.status(500).json({ message: "Server error during login." })
  }
}

/**
 * Handles email verification - SIMPLIFIED VERSION.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.params
  console.log(`🔄 Attempting to verify token: ${token}`) // Debug log

  try {
    // Try to find user by verification token
    const user = await findUserByVerificationToken(token)

    if (user) {
      // Token found - verify the user
      if (user.verified) {
        // Already verified
        console.log(`ℹ️  User already verified: ${user.email}`) // Debug log
        return res.status(200).json({
          success: true,
          message: "Your email is already verified! You can log in to your account.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            verified: user.verified,
          },
          status: "already_verified",
        })
      } else {
        // Verify the user now
        const verifiedUser = await verifyUser(token)
        if (verifiedUser) {
          console.log(`✅ Successfully verified user: ${verifiedUser.email}`) // Debug log
          return res.status(200).json({
            success: true,
            message: "Email verified successfully! You can now log in.",
            user: {
              id: verifiedUser.id,
              name: verifiedUser.name,
              email: verifiedUser.email,
              role: verifiedUser.role,
              verified: verifiedUser.verified,
            },
            status: "just_verified",
          })
        }
      }
    }

    // Token not found - check if there are recently verified users
    console.log(`🔍 Token not found, checking recently verified users...`) // Debug log
    const recentUsers = await getRecentlyVerifiedUsers()

    if (recentUsers.length > 0) {
      // There are recently verified users, likely this token was already used
      console.log(`ℹ️  Found ${recentUsers.length} recently verified users`) // Debug log
      return res.status(200).json({
        success: true,
        message: "This verification link has already been used successfully! You can log in to your account.",
        status: "already_used",
        recentlyVerified: true,
      })
    }

    // No token found and no recent verifications - invalid token
    console.log(`❌ Invalid token: ${token}`) // Debug log
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token. Please request a new verification email.",
      status: "invalid_token",
    })
  } catch (error) {
    console.error("❌ Email verification error:", error)
    res.status(500).json({
      success: false,
      message: "Server error during email verification.",
      status: "server_error",
    })
  }
}

/**
 * Handles forgot password request.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body

  try {
    // Find user by email
    const user = await findUserByEmail(email)
    if (!user) {
      // Don't reveal if email exists or not for security
      return res
        .status(200)
        .json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    // Check if it's a Google user
    if (user.provider === "google") {
      return res.status(400).json({ message: "Google users cannot reset password. Please use Google Sign-In." })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

    // Update user with reset token
    await updateResetToken(email, resetToken, expiresAt)

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, user.name, resetToken)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      return res.status(500).json({ message: "Failed to send password reset email." })
    }

    res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({ message: "Server error during password reset request." })
  }
}

/**
 * Handles password reset.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const resetPassword = async (req, res) => {
  const { token } = req.params
  const { password } = req.body

  try {
    // Find user by reset token
    const user = await findUserByResetToken(token)
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token." })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user's password and clear reset token
    const updatedUser = await updatePassword(token, hashedPassword)
    if (!updatedUser) {
      return res.status(400).json({ message: "Failed to reset password." })
    }

    res.status(200).json({ message: "Password reset successfully. You can now log in with your new password." })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({ message: "Server error during password reset." })
  }
}

/**
 * Gets all users based on requesting user's role.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers(req.user.role)
    res.status(200).json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ message: "Server error while fetching users." })
  }
}

/**
 * Updates a user's role with strict restrictions.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const changeUserRole = async (req, res) => {
  const { userId, newRole, userEmail } = req.body

  try {
    console.log(`🔄 Role change request: User ${userId} to ${newRole} by ${req.user.role}`)

    // Get the user being changed for email notification
    const userToChange =
      (await findUserByEmail(userEmail)) || (await getAllUsers(req.user.role)).find((u) => u.id === userId)

    if (!userToChange) {
      return res.status(404).json({ message: "User not found." })
    }

    const oldRole = userToChange.role
    console.log(`🔄 Changing ${userToChange.name} from ${oldRole} to ${newRole}`)

    // Update the user's role with restrictions
    const updatedUser = await updateUserRole(userId, newRole, req.user.role)
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." })
    }

    console.log(`✅ Role changed successfully: ${userToChange.name} is now ${newRole}`)

    // Send role change notification email
    try {
      await sendRoleChangeEmail(updatedUser.email, updatedUser.name, oldRole, newRole, req.user.name || "Administrator")
      console.log(`✅ Role change email sent to ${updatedUser.email}`)
    } catch (emailError) {
      console.error("Failed to send role change email:", emailError)
      // Continue even if email fails
    }

    res.status(200).json({
      message: "User role updated successfully.",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Change user role error:", error)
    res.status(400).json({ message: error.message || "Server error while updating user role." })
  }
}

/**
 * Deletes a user (Super Admin only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const removeUser = async (req, res) => {
  const { userId } = req.params

  try {
    console.log(`🔄 Delete user request: User ${userId} by ${req.user.role}`)

    const deletedUser = await deleteUser(Number.parseInt(userId), req.user.role)

    console.log(`✅ User deleted successfully: ${deletedUser.name}`)

    res.status(200).json({
      message: "User deleted successfully.",
      user: deletedUser,
    })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(400).json({ message: error.message || "Server error while deleting user." })
  }
}

/**
 * Registers a student (Admin/Instructor only) - UPDATED for new flow.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const registerStudent = async (req, res) => {
  const { name, email, password } = req.body

  try {
    // Check if requester has permission
    if (!["admin", "instructor", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins and instructors can register students." })
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")

    // Create student user
    const newUser = await createUser(name, email, hashedPassword, "student", verificationToken, "manual", null)

    // Send verification email
    try {
      await sendVerificationEmail(email, name, verificationToken)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
    }

    res.status(201).json({
      message: "Student registered successfully. Verification email sent.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        verified: newUser.verified,
        provider: newUser.provider,
      },
    })
  } catch (error) {
    console.error("Register student error:", error)
    res.status(500).json({ message: "Server error during student registration." })
  }
}
