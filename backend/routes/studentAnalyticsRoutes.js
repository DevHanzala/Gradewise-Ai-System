import express from "express"
import { protect } from "../middleware/authMiddleware.js"
import {
  getStudentOverview,
  getStudentPerformance,
  getStudentRecommendations,
  getStudentReport
} from "../controllers/studentAnalyticsController.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Student Analytics Routes
router.get("/overview", getStudentOverview)
router.get("/performance", getStudentPerformance)
router.get("/recommendations", getStudentRecommendations)
router.get("/report", getStudentReport)

export default router