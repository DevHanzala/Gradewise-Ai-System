// backend/routes/courseRoutes.js
import { Router } from "express"
import {
  createNewCourse,
  getInstructorCourses,
  getCourseById,
  updateExistingCourse,
  deleteExistingCourse,
  enrollStudentInCourse,
  getCourseStudents,
  getStudentEnrolledCourses,
  getAllCoursesAdmin,
  unenrollStudentFromCourse,
} from "../controllers/courseController.js"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"

const router = Router()

// Course management routes (Instructor only)
router.post("/", protect, authorizeRoles("instructor", "admin"), createNewCourse)
router.get("/instructor", protect, authorizeRoles("instructor"), getInstructorCourses)
router.get("/:courseId", protect, getCourseById)
router.put("/:courseId", protect, authorizeRoles("instructor", "admin"), updateExistingCourse)
router.delete("/:courseId", protect, authorizeRoles("instructor", "admin"), deleteExistingCourse)

// Student enrollment routes
router.post("/:courseId/enroll", protect, authorizeRoles("instructor", "admin"), enrollStudentInCourse)
router.get("/:courseId/students", protect, authorizeRoles("instructor", "admin"), getCourseStudents)
router.delete(
  "/:courseId/students/:studentId",
  protect,
  authorizeRoles("instructor", "admin"),
  unenrollStudentFromCourse,
)

// Student routes
router.get("/student/enrolled", protect, authorizeRoles("student"), getStudentEnrolledCourses)

// Admin routes
router.get("/admin/all", protect, authorizeRoles("admin"), getAllCoursesAdmin)

export default router
