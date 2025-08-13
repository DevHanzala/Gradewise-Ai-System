// backend/routes/dashboardRoutes.js
import { Router } from "express"
import { getAdminOverview, getInstructorOverview, getStudentOverview } from "../controllers/dashboardController.js"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"

const router = Router()

// Dashboard overview routes
router.get("/admin/overview", protect, authorizeRoles("admin"), getAdminOverview)
router.get("/instructor/overview", protect, authorizeRoles("instructor"), getInstructorOverview)
router.get("/student/overview", protect, authorizeRoles("student"), getStudentOverview)

export default router
