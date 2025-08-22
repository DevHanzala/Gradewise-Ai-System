// backend/routes/assignmentRoutes.js
import { Router } from "express"
import {
  createNewAssignment,
  getCourseAssignments,
  getAssignmentById,
  updateExistingAssignment,
  deleteExistingAssignment,
  getStudentAssignmentsList,
  getAllAssignmentsAdmin,
  getInstructorAssignmentsList,
} from "../controllers/assignmentController.js"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"

const router = Router()

// Assignment management routes
router.post("/", protect, authorizeRoles("instructor", "admin"), createNewAssignment)
router.get("/course/:courseId", protect, getCourseAssignments)
router.get("/:assignmentId", protect, getAssignmentById)
router.put("/:assignmentId", protect, authorizeRoles("instructor", "admin"), updateExistingAssignment)
router.delete("/:assignmentId", protect, authorizeRoles("instructor", "admin"), deleteExistingAssignment)

// Student routes
router.get("/student/list", protect, authorizeRoles("student"), getStudentAssignmentsList)

// Instructor routes
router.get("/instructor/list", protect, authorizeRoles("instructor"), getInstructorAssignmentsList)

// Admin routes
router.get("/admin/all", protect, authorizeRoles("admin"), getAllAssignmentsAdmin)

export default router
