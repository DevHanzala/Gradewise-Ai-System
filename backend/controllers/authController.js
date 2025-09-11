import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  createUser,
  createGoogleUser,
  findUserByEmail,
  findUserByUID,
  findUserByVerificationToken,
  verifyUser,
  updateResetToken,
  updatePasswordById,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getRecentlyVerifiedUsers,
  findUserByResetToken,
} from "../models/userModel.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendRoleChangeEmail } from "../services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Handles user signup (manual registration).
 */
export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    console.log(`🔄 Starting signup process for: ${email}`);

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      console.log(`❌ User already exists: ${email}`);
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`✅ Password hashed for: ${email}`);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    console.log(`✅ Generated verification token for ${email}: ${verificationToken}`);

    const newUser = await createUser(name, email, hashedPassword, "student", verificationToken, "manual", null);
    console.log(`✅ User created in database:`, {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      verified: newUser.verified,
      provider: newUser.provider,
      hasToken: !!verificationToken,
    });

    try {
      await sendVerificationEmail(email, name, verificationToken);
      console.log(`✅ Verification email sent to ${email}`);
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
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
      });
    }

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
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
};

/**
 * Handles Google authentication (signup/login).
 */
export const googleAuth = async (req, res) => {
  const { name, email, uid } = req.body;

  try {
    console.log(`🔄 Starting Google auth process for: ${email}`);

    let user = await findUserByEmail(email);

    if (user) {
      if (user.provider === "google") {
        console.log(`✅ Existing Google user found: ${email}`);
        if (user.uid !== uid) {
          console.log(`🔄 Updating UID for existing Google user: ${email}`);
        }
      } else if (user.provider === "manual") {
        console.log(`🔗 Manual user exists, linking with Google: ${email}`);
      }
    } else {
      const userByUID = await findUserByUID(uid);
      if (userByUID) {
        console.log(`⚠️ User found by UID but different email: ${email}`);
        return res.status(400).json({
          message: "This Google account is already linked to a different email address.",
        });
      }

      console.log(`🆕 Creating new Google user: ${email}`);
      user = await createGoogleUser(name, email, uid, "student");
      console.log(`✅ Google user created:`, {
        id: user.id,
        email: user.email,
        role: user.role,
        provider: user.provider,
        uid: user.uid,
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    console.log(`✅ Google auth successful for: ${email}`);

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
    });
  } catch (error) {
    console.error("❌ Google auth error:", error);
    res.status(500).json({ message: "Server error during Google authentication." });
  }
};

/**
 * Handles user login.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`🔄 Login attempt for: ${email}`);

    const user = await findUserByEmail(email);
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(400).json({ message: "Invalid credentials." });
    }

    console.log(`✅ User found: ${email}, verified: ${user.verified}, provider: ${user.provider}`);

    if (user.provider === "google") {
      return res.status(400).json({ message: "Please use Google Sign-In for this account." });
    }

    if (!user.verified && user.role !== "super_admin") {
      console.log(`❌ User not verified: ${email}`);
      return res.status(400).json({ message: "Please verify your email before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    console.log(`✅ Login successful for: ${email}`);

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
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

/**
 * Handles email verification.
 */
export const verifyEmail = async (req, res) => {
  const { token } = req.params;
  console.log(`🔄 Attempting to verify token: ${token}`);

  try {
    const user = await findUserByVerificationToken(token);

    if (user) {
      if (user.verified) {
        console.log(`ℹ️ User already verified: ${user.email}`);
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
        });
      } else {
        const verifiedUser = await verifyUser(token);
        if (verifiedUser) {
          console.log(`✅ Successfully verified user: ${verifiedUser.email}`);
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
          });
        }
      }
    }

    console.log(`🔍 Token not found, checking recently verified users...`);
    const recentUsers = await getRecentlyVerifiedUsers();

    if (recentUsers.length > 0) {
      console.log(`ℹ️ Found ${recentUsers.length} recently verified users`);
      return res.status(200).json({
        success: true,
        message: "This verification link has already been used successfully! You can log in to your account.",
        status: "already_used",
        recentlyVerified: true,
      });
    }

    console.log(`❌ Invalid token: ${token}`);
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token. Please request a new verification email.",
      status: "invalid_token",
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification.",
      status: "server_error",
    });
  }
};

/**
 * Handles forgot password request.
 * Sends an email with a link to /reset-password/:resetId.
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res
        .status(200)
        .json({ message: "If an account with that email exists, a password reset link has been sent." });
    }

    if (user.provider === "google") {
      return res.status(400).json({ message: "Google users cannot reset password. Please use Google Sign-In." });
    }

    // Generate a unique reset identifier
    const resetId = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration
    await updateResetToken(email, resetId, expiresAt);

    // Send email with a link to /reset-password/:resetId
    try {
      await sendPasswordResetEmail(email, user.name, resetId);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (emailError) {
      console.error("❌ Failed to send password reset email:", emailError);
      return res.status(500).json({ message: "Failed to send password reset email. Please try again or contact support." });
    }

    res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent." });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Server error during password reset request." });
  }
};

/**
 * Handles password change for logged-in users or reset after forgot password.
 * For reset, requires a valid resetId from the email link.
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword, resetId } = req.body;

  try {
    let user;

    // Case 1: Logged-in user changing password
    if (currentPassword && !resetId) {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required for password change." });
      }
      user = await findUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect." });
      }
    }
    // Case 2: Reset flow (after forgot password email)
    else if (resetId && !currentPassword) {
      const resetData = await findUserByResetToken(resetId);
      if (!resetData || new Date() > resetData.reset_token_expires) {
        return res.status(400).json({ message: "Invalid or expired reset link." });
      }
      user = resetData;
    } else {
      return res.status(400).json({ message: "Invalid request. Provide current password or reset ID." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await updatePasswordById(user.id, hashedPassword);

    if (!updatedUser) {
      return res.status(500).json({ message: "Failed to update password." });
    }

    // Clear reset token after successful reset
    if (resetId) {
      await updateResetToken(user.email, null, null);
    }

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ message: "Server error during password change." });
  }
};

/**
 * Gets all users based on requesting user's role.
 */
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers(req.user.role);
    res.status(200).json({ users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error while fetching users." });
  }
};

/**
 * Updates a user's role with strict restrictions.
 */
export const changeUserRole = async (req, res) => {
  const { userId, newRole, userEmail } = req.body;

  try {
    console.log(`🔄 Role change request: User ${userId} to ${newRole} by ${req.user.role}`);

    const userToChange =
      (await findUserByEmail(userEmail)) || (await getAllUsers(req.user.role)).find((u) => u.id === userId);

    if (!userToChange) {
      return res.status(404).json({ message: "User not found." });
    }

    const oldRole = userToChange.role;
    console.log(`🔄 Changing ${userToChange.name} from ${oldRole} to ${newRole}`);

    const updatedUser = await updateUserRole(userId, newRole, req.user.role);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    console.log(`✅ Role changed successfully: ${userToChange.name} is now ${newRole}`);

    try {
      await sendRoleChangeEmail(
        updatedUser.email,
        updatedUser.name,
        oldRole,
        newRole,
        req.user.name || "Administrator"
      );
      console.log(`✅ Role change email sent to ${updatedUser.email}`);
    } catch (emailError) {
      console.error("Failed to send role change email:", emailError);
    }

    res.status(200).json({
      message: "User role updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Change user role error:", error);
    res.status(400).json({ message: error.message || "Server error while updating user role." });
  }
};

/**
 * Deletes a user (Super Admin only).
 */
export const removeUser = async (req, res) => {
  const { userId } = req.params;

  try {
    console.log(`🔄 Delete user request: User ${userId} by ${req.user.role}`);

    const deletedUser = await deleteUser(Number.parseInt(userId), req.user.role);

    console.log(`✅ User deleted successfully: ${deletedUser.name}`);

    res.status(200).json({
      message: "User deleted successfully.",
      user: deletedUser,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(400).json({ message: error.message || "Server error while deleting user." });
  }
};

/**
 * Registers a student (Admin/Instructor only).
 */
export const registerStudent = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!["admin", "instructor", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins and instructors can register students." });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = await createUser(name, email, hashedPassword, "student", verificationToken, "manual", null);

    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
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
    });
  } catch (error) {
    console.error("Register student error:", error);
    res.status(500).json({ message: "Server error during student registration." });
  }
};