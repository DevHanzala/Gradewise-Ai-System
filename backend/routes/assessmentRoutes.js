import express from "express"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"
import {
  createAssessment,
  getInstructorAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  enrollStudentInAssessment,
  getAssessmentStudents,
  getStudentAssessments,
  getAllAssessments,
  unenrollStudentFromAssessment,
} from "../controllers/assessmentController.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Instructor routes
router.post("/", authorizeRoles("instructor", "admin"), createAssessment)
router.get("/instructor", authorizeRoles("instructor", "admin"), getInstructorAssessments)
router.get("/:assessmentId", getAssessmentById)
router.put("/:assessmentId", authorizeRoles("instructor", "admin"), updateAssessment)
router.delete("/:assessmentId", authorizeRoles("instructor", "admin"), deleteAssessment)

// Student enrollment routes
router.post("/:assessmentId/enroll", authorizeRoles("instructor", "admin"), enrollStudentInAssessment)
router.get("/:assessmentId/students", authorizeRoles("instructor", "admin"), getAssessmentStudents)
router.delete(
  "/:assessmentId/students/:studentId",
  authorizeRoles("instructor", "admin"),
  unenrollStudentFromAssessment,
)

// Student routes
router.get("/student/enrolled", authorizeRoles("student"), getStudentAssessments)

// Admin routes
router.get("/admin/all", authorizeRoles("admin"), getAllAssessments)

export default router
