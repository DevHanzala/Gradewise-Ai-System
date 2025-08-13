import { Router } from "express"
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

const router = Router()

// Assessment management routes (Instructor only)
router.post("/", protect, authorizeRoles("instructor", "admin"), createAssessment)
router.get("/instructor", protect, authorizeRoles("instructor"), getInstructorAssessments)
router.get("/:assessmentId", protect, getAssessmentById)
router.put("/:assessmentId", protect, authorizeRoles("instructor", "admin"), updateAssessment)
router.delete("/:assessmentId", protect, authorizeRoles("instructor", "admin"), deleteAssessment)

// Student enrollment routes
router.post("/:assessmentId/enroll", protect, authorizeRoles("instructor", "admin"), enrollStudentInAssessment)
router.get("/:assessmentId/students", protect, authorizeRoles("instructor", "admin"), getAssessmentStudents)
router.delete(
  "/:assessmentId/students/:studentId",
  protect,
  authorizeRoles("instructor", "admin"),
  unenrollStudentFromAssessment,
)

// Student routes
router.get("/student/enrolled", protect, authorizeRoles("student"), getStudentAssessments)

// Admin routes
router.get("/admin/all", protect, authorizeRoles("admin"), getAllAssessments)

export default router
