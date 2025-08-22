import express from "express"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"
import {
  startAssessment,
  getAssessmentSessionDetails,
  saveAnswer,
  submitAssessmentController,
  getSubmissionDetails,
  getAssessmentSubmissionsController,
} from "../controllers/assessmentTakingController.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Student routes for taking assessments
router.post("/:assessmentId/start", authorizeRoles("student"), startAssessment)
router.get("/sessions/:sessionId", authorizeRoles("student"), getAssessmentSessionDetails)
router.post("/sessions/:sessionId/answer", authorizeRoles("student"), saveAnswer)
router.post("/sessions/:sessionId/submit", authorizeRoles("student"), submitAssessmentController)

// Submission routes
router.get("/submissions/:submissionId", getSubmissionDetails)
router.get("/:assessmentId/submissions", authorizeRoles("instructor", "admin"), getAssessmentSubmissionsController)

export default router
