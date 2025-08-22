import express from "express"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"
import {
  createQuestionHandler,
  getQuestionsByAssessmentHandler,
  getQuestionByIdHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  reorderQuestionsHandler,
  duplicateQuestionHandler,
  getQuestionStatsHandler,
  generateAssessmentQuestions,
  importQuestionsHandler,
  exportQuestionsHandler,
  importFromFormatHandler,
  analyzeQuestionHandler,
  getQuestionFilesHandler,
  loadFromFileHandler,
  deleteQuestionFilesHandler,
} from "../controllers/questionController.js"

const router = express.Router()

// All routes require authentication
router.use(protect)

// Question CRUD operations
router.post("/assessment/:assessmentId", authorizeRoles("instructor", "admin"), createQuestionHandler)
router.get("/assessment/:assessmentId", getQuestionsByAssessmentHandler)
router.get("/:id", getQuestionByIdHandler)
router.put("/:id", authorizeRoles("instructor", "admin"), updateQuestionHandler)
router.delete("/:id", authorizeRoles("instructor", "admin"), deleteQuestionHandler)

// Question management operations
router.post("/assessment/:assessmentId/reorder", authorizeRoles("instructor", "admin"), reorderQuestionsHandler)
router.post("/:id/duplicate", authorizeRoles("instructor", "admin"), duplicateQuestionHandler)
router.get("/assessment/:assessmentId/stats", getQuestionStatsHandler)

// AI question generation
router.post("/assessment/:assessmentId/generate", authorizeRoles("instructor", "admin"), generateAssessmentQuestions)

// Import/Export operations
router.post("/assessment/:assessmentId/import", authorizeRoles("instructor", "admin"), importQuestionsHandler)
router.get("/assessment/:assessmentId/export", authorizeRoles("instructor", "admin"), exportQuestionsHandler)
router.post("/assessment/:assessmentId/import-format", authorizeRoles("instructor", "admin"), importFromFormatHandler)

// Question analysis
router.get("/:id/analyze", authorizeRoles("instructor", "admin"), analyzeQuestionHandler)

// File management
router.get("/assessment/:assessmentId/files", authorizeRoles("instructor", "admin"), getQuestionFilesHandler)
router.get("/files/:filename", authorizeRoles("instructor", "admin"), loadFromFileHandler)
router.delete("/assessment/:assessmentId/files", authorizeRoles("instructor", "admin"), deleteQuestionFilesHandler)

export default router
