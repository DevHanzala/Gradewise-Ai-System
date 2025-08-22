import express from "express"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"
import {
  createNewAssessment,
  getInstructorAssessments,
  getStudentAssessmentList,
  getAssessment,
  updateExistingAssessment,
  deleteExistingAssessment,
  enrollSingleStudent,
  enrollMultipleStudents,
  getAssessmentStudents,
  unenrollStudent,
  getAllAssessmentList,
} from "../controllers/assessmentController.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Assessment CRUD routes
router.post("/", authorizeRoles("instructor", "admin"), createNewAssessment)
router.get("/instructor", authorizeRoles("instructor"), getInstructorAssessments)
router.get("/student/enrolled", authorizeRoles("student"), getStudentAssessmentList)
router.get("/admin/all", authorizeRoles("admin", "super_admin"), getAllAssessmentList)
router.get("/:id", getAssessment)
router.put("/:id", authorizeRoles("instructor", "admin"), updateExistingAssessment)
router.delete("/:id", authorizeRoles("instructor", "admin"), deleteExistingAssessment)

// Student enrollment routes
router.post("/:id/enroll", authorizeRoles("instructor", "admin"), enrollSingleStudent)
router.post("/:id/enroll-bulk", authorizeRoles("instructor", "admin"), enrollMultipleStudents)
router.get("/:id/students", authorizeRoles("instructor", "admin"), getAssessmentStudents)
router.delete("/:id/students/:studentId", authorizeRoles("instructor", "admin"), unenrollStudent)

export default router
