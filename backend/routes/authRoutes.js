import express from "express";
import {
  signup,
  login,
  googleAuth,
  verifyEmail,
  forgotPassword,
  getUsers,
  changeUserRole,
  removeUser,
  registerStudent,
  changePassword,
} from "../controllers/authController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/signup", signup); // User signup (always creates student)
router.post("/login", login); // User login
router.post("/google-auth", googleAuth); // Google authentication
router.get("/verify/:token", verifyEmail); // Email verification
router.post("/forgot-password", forgotPassword); // Forgot password
router.post("/change-password", changePassword); // Password change (public for reset flow)

// Protected routes (authentication required)
router.use(protect);

router.post("/register-student", authorizeRoles("admin", "instructor", "super_admin"), registerStudent); // Register student
router.get("/users", authorizeRoles("admin", "super_admin"), getUsers); // Get all users
router.put("/change-role", authorizeRoles("admin", "super_admin"), changeUserRole); // Change user role
router.delete("/users/:userId", authorizeRoles("super_admin"), removeUser); // Delete user

export default router;