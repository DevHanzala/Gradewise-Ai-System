import express from "express"
import { protect, authorizeRoles } from "../middleware/authMiddleware.js"
import {
  saveQuestion,
  searchQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestions,
  getStats,
  getTags,
  bulkSaveQuestions,
  exportQuestions
} from "../controllers/questionBankController.js"

const router = express.Router()

// All routes require authentication and instructor/admin role
router.use(protect)
router.use(authorizeRoles("instructor", "admin"))

// Question Bank CRUD Routes
router.post("/save", saveQuestion)
router.get("/search", searchQuestions)
router.get("/:id", getQuestion)
router.put("/:id", updateQuestion)
router.delete("/:id", deleteQuestion)

// Import and Export Routes
router.post("/import/:assessmentId", importQuestions)
router.post("/bulk-save", bulkSaveQuestions)
router.get("/export", exportQuestions)

// Statistics and Tags
router.get("/stats", getStats)
router.get("/tags", getTags)

export default router

