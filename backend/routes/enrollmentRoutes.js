import express from "express"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"
import {
  processCSVFile,
  previewEnrollment,
  executeEnrollment,
  getEnrollmentStatistics,
  exportEnrollmentCSV,
  bulkEnrollByEmail
} from "../controllers/enrollmentController.js"

const router = express.Router()

// All routes require authentication and instructor/admin role
router.use(protect)
router.use(authorizeRoles("instructor", "admin"))

// CSV Processing
router.post("/process-csv", processCSVFile)

// Bulk Enrollment Routes
router.post("/:assessmentId/preview", previewEnrollment)
router.post("/:assessmentId/execute", executeEnrollment)
router.post("/:assessmentId/bulk-email", bulkEnrollByEmail)

// Statistics and Export
router.get("/:assessmentId/stats", getEnrollmentStatistics)
router.get("/:assessmentId/export", exportEnrollmentCSV)

export default router
