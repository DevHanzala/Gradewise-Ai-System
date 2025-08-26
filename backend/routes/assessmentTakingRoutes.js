import express from "express"
import {
  startAttempt,
  saveAttemptProgress,
  submitAttempt,
  getProgress,
  getResumeStatus,
  getTimerInfo
} from "../controllers/assessmentTakingController.js"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Assessment taking routes (student only)
router.post("/:id/start", authorizeRoles("student"), startAttempt)
router.post("/attempt/:attemptId/save", authorizeRoles("student"), saveAttemptProgress)
router.post("/attempt/:attemptId/submit", authorizeRoles("student"), submitAttempt)
router.get("/attempt/:attemptId/progress", authorizeRoles("student"), getProgress)
router.get("/:id/resume-status", authorizeRoles("student"), getResumeStatus)
router.get("/:id/timer", authorizeRoles("student"), getTimerInfo)

export default router
