import express from "express"
import {
  signup,
  login,
  googleAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getUsers,
  changeUserRole,
  removeUser,
  registerStudent,
} from "../controllers/authController.js"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"

const router = express.Router()

// Public routes (no authentication required)
router.post("/signup", signup) // User signup (always creates student)
router.post("/login", login) // User login
router.post("/google-auth", googleAuth) // Google authentication
router.get("/verify/:token", verifyEmail) // Email verification
router.post("/forgot-password", forgotPassword) // Forgot password
router.post("/reset-password/:token", resetPassword) // Reset password

// Protected routes (authentication required)
router.use(protect) // Apply authentication middleware to all routes below

// Admin and Instructor routes
router.post("/register-student", authorizeRoles("admin", "instructor", "super_admin"), registerStudent) // Register student

// Admin and Super Admin routes
router.get("/users", authorizeRoles("admin", "super_admin"), getUsers) // Get all users
router.put("/change-role", authorizeRoles("admin", "super_admin"), changeUserRole) // Change user role

// Super Admin only routes
router.delete("/users/:userId", authorizeRoles("super_admin"), removeUser) // Delete user

export default router
