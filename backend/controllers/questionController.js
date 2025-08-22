import {
  createQuestion,
  getQuestionsByAssessment,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  duplicateQuestion,
  getQuestionStats,
  searchQuestions,
  bulkCreateQuestions,
} from "../models/questionModel.js"

import {
  saveQuestionsToFile,
  loadQuestionsFromFile,
  getAssessmentQuestionFiles,
  deleteAssessmentQuestions,
  validateQuestion,
  formatQuestionsForExport,
  importQuestionsFromFormat,
  generateQuestionsWithAI,
  analyzeQuestionQuality,
} from "../services/aiService.js"

// Import database connection
import db from "../DB/db.js"

/**
 * Create a new question
 */
export const createQuestionHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const questionData = { ...req.body, assessment_id: assessmentId }

    // Validate question
    const validation = validateQuestion(questionData)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Question validation failed",
        errors: validation.errors,
      })
    }

    const question = await createQuestion(questionData)

    res.status(201).json({
      success: true,
      message: "Question created successfully",
      data: question,
    })
  } catch (error) {
    console.error("❌ Create question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create question",
      error: error.message,
    })
  }
}

/**
 * Get questions by assessment ID
 * @route GET /api/questions/assessment/:assessmentId
 */
export const getQuestionsByAssessmentHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    console.log(`📋 Fetching questions for assessment ${assessmentId} by user ${userId} (${userRole})`)

    // Check if user has access to this assessment
    if (userRole === "instructor") {
      // For instructors, check if they own the assessment
      const assessmentCheck = await db.query(
        "SELECT id FROM assessments WHERE id = $1 AND instructor_id = $2",
        [assessmentId, userId]
      )
      
      if (assessmentCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view questions for your own assessments."
        })
      }
    }

    // Get question blocks for the assessment with safe column selection
    const questionBlocksQuery = `
      SELECT 
        id,
        block_title,
        block_description,
        question_count,
        marks_per_question,
        difficulty_level,
        question_type,
        COALESCE(topics, '{}') as topics,
        COALESCE(block_order, 1) as block_order,
        created_at
      FROM question_blocks 
      WHERE assessment_id = $1 
      ORDER BY COALESCE(block_order, 1) ASC, created_at ASC
    `
    
    const questionBlocksResult = await db.query(questionBlocksQuery, [assessmentId])
    const questionBlocks = questionBlocksResult.rows

    console.log(`✅ Found ${questionBlocks.length} question blocks for assessment ${assessmentId}`)

    res.status(200).json({
      success: true,
      message: "Questions retrieved successfully",
      data: {
        assessment_id: assessmentId,
        question_blocks: questionBlocks,
        total_blocks: questionBlocks.length
      }
    })

  } catch (error) {
    console.error("❌ Get questions by assessment error:", error)
    
    // Check if it's a column missing error
    if (error.code === '42703') {
      console.log("🔧 Column missing error detected. Please run the table fix script.")
      return res.status(500).json({
        success: false,
        message: "Database schema needs to be updated. Please contact administrator.",
        error: "Missing database column. Run: node scripts/fixQuestionBlocksTable.js"
      })
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to retrieve questions",
      error: error.message
    })
  }
}

/**
 * Get question by ID
 */
export const getQuestionByIdHandler = async (req, res) => {
  try {
    const { id } = req.params
    const question = await getQuestionById(id)

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }

    res.json({
      success: true,
      message: "Question retrieved successfully",
      data: question,
    })
  } catch (error) {
    console.error("❌ Get question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve question",
      error: error.message,
    })
  }
}

/**
 * Update question
 */
export const updateQuestionHandler = async (req, res) => {
  try {
    const { id } = req.params

    // Validate updated question data
    const validation = validateQuestion({ ...req.body, id })
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Question validation failed",
        errors: validation.errors,
      })
    }

    const question = await updateQuestion(id, req.body)

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }

    res.json({
      success: true,
      message: "Question updated successfully",
      data: question,
    })
  } catch (error) {
    console.error("❌ Update question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: error.message,
    })
  }
}

/**
 * Delete question
 */
export const deleteQuestionHandler = async (req, res) => {
  try {
    const { id } = req.params
    const question = await deleteQuestion(id)

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }

    res.json({
      success: true,
      message: "Question deleted successfully",
      data: question,
    })
  } catch (error) {
    console.error("❌ Delete question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
      error: error.message,
    })
  }
}

/**
 * Reorder questions
 */
export const reorderQuestionsHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const { questionOrders } = req.body

    if (!Array.isArray(questionOrders)) {
      return res.status(400).json({
        success: false,
        message: "questionOrders must be an array",
      })
    }

    const questions = await reorderQuestions(assessmentId, questionOrders)

    res.json({
      success: true,
      message: "Questions reordered successfully",
      data: questions,
    })
  } catch (error) {
    console.error("❌ Reorder questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to reorder questions",
      error: error.message,
    })
  }
}

/**
 * Duplicate question
 */
export const duplicateQuestionHandler = async (req, res) => {
  try {
    const { id } = req.params
    const question = await duplicateQuestion(id)

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }

    res.status(201).json({
      success: true,
      message: "Question duplicated successfully",
      data: question,
    })
  } catch (error) {
    console.error("❌ Duplicate question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to duplicate question",
      error: error.message,
    })
  }
}

/**
 * Get question statistics
 */
export const getQuestionStatsHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const stats = await getQuestionStats(assessmentId)

    res.json({
      success: true,
      message: "Question statistics retrieved successfully",
      data: stats,
    })
  } catch (error) {
    console.error("❌ Get question stats error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve question statistics",
      error: error.message,
    })
  }
}

/**
 * Generate questions with AI
 */
export const generateAssessmentQuestions = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const {
      topic,
      count = 5,
      difficulty = "medium",
      type = "multiple_choice",
      context = "",
      language = "en",
      saveToFile = true,
    } = req.body

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: "Topic is required for question generation",
      })
    }

    console.log(`📋 Generating questions for assessment: ${assessmentId}`)

    const config = {
      topic,
      count: Number.parseInt(count),
      difficulty,
      type,
      context,
      language,
    }

    const questions = await generateQuestionsWithAI(config)

    let fileInfo = null
    if (saveToFile) {
      fileInfo = await saveQuestionsToFile(assessmentId, questions)
    }

    res.json({
      success: true,
      message: `Generated ${questions.length} questions successfully`,
      data: {
        questions,
        file: fileInfo,
        config,
      },
    })
  } catch (error) {
    console.error("❌ Generate questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to generate questions",
      error: error.message,
    })
  }
}

/**
 * Import questions to assessment
 */
export const importQuestionsHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const { questions, validate = true } = req.body

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Questions must be an array",
      })
    }

    const validQuestions = []
    const invalidQuestions = []

    // Validate questions if requested
    if (validate) {
      questions.forEach((question, index) => {
        const validation = validateQuestion(question)
        if (validation.isValid) {
          validQuestions.push(question)
        } else {
          invalidQuestions.push({
            index,
            question,
            errors: validation.errors,
          })
        }
      })
    } else {
      validQuestions.push(...questions)
    }

    // Import valid questions
    let importedQuestions = []
    if (validQuestions.length > 0) {
      importedQuestions = await bulkCreateQuestions(assessmentId, validQuestions)
    }

    res.json({
      success: true,
      message: `Imported ${importedQuestions.length} questions successfully`,
      data: {
        imported: importedQuestions,
        invalid: invalidQuestions,
        summary: {
          total: questions.length,
          imported: importedQuestions.length,
          invalid: invalidQuestions.length,
        },
      },
    })
  } catch (error) {
    console.error("❌ Import questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to import questions",
      error: error.message,
    })
  }
}

/**
 * Export questions from assessment
 */
export const exportQuestionsHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const { format = "json" } = req.query

    const questions = await getQuestionsByAssessment(assessmentId)

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No questions found for this assessment",
      })
    }

    const exportData = formatQuestionsForExport(questions, format)

    // Set appropriate headers for file download
    const filename = `assessment_${assessmentId}_questions.${format}`

    switch (format.toLowerCase()) {
      case "csv":
        res.setHeader("Content-Type", "text/csv")
        break
      case "txt":
        res.setHeader("Content-Type", "text/plain")
        break
      default:
        res.setHeader("Content-Type", "application/json")
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.send(exportData)
  } catch (error) {
    console.error("❌ Export questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to export questions",
      error: error.message,
    })
  }
}

/**
 * Import questions from file format
 */
export const importFromFormatHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const { data, format = "json", validate = true } = req.body

    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Data is required for import",
      })
    }

    const questions = importQuestionsFromFormat(data, format)

    const validQuestions = []
    const invalidQuestions = []

    // Validate questions if requested
    if (validate) {
      questions.forEach((question, index) => {
        const validation = validateQuestion(question)
        if (validation.isValid) {
          validQuestions.push(question)
        } else {
          invalidQuestions.push({
            index,
            question,
            errors: validation.errors,
          })
        }
      })
    } else {
      validQuestions.push(...questions)
    }

    // Import valid questions
    let importedQuestions = []
    if (validQuestions.length > 0) {
      importedQuestions = await bulkCreateQuestions(assessmentId, validQuestions)
    }

    res.json({
      success: true,
      message: `Imported ${importedQuestions.length} questions from ${format} format`,
      data: {
        imported: importedQuestions,
        invalid: invalidQuestions,
        summary: {
          total: questions.length,
          imported: importedQuestions.length,
          invalid: invalidQuestions.length,
        },
      },
    })
  } catch (error) {
    console.error("❌ Import from format error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to import questions from format",
      error: error.message,
    })
  }
}

/**
 * Analyze question quality
 */
export const analyzeQuestionHandler = async (req, res) => {
  try {
    const { id } = req.params
    const question = await getQuestionById(id)

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      })
    }

    const analysis = analyzeQuestionQuality(question)

    res.json({
      success: true,
      message: "Question analysis completed",
      data: {
        question,
        analysis,
      },
    })
  } catch (error) {
    console.error("❌ Analyze question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to analyze question",
      error: error.message,
    })
  }
}

/**
 * Get generated question files
 */
export const getQuestionFilesHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const files = await getAssessmentQuestionFiles(assessmentId)

    res.json({
      success: true,
      message: "Question files retrieved successfully",
      data: files,
      count: files.length,
    })
  } catch (error) {
    console.error("❌ Get question files error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve question files",
      error: error.message,
    })
  }
}

/**
 * Load questions from file
 */
export const loadFromFileHandler = async (req, res) => {
  try {
    const { filename } = req.params
    const data = await loadQuestionsFromFile(filename)

    res.json({
      success: true,
      message: "Questions loaded from file successfully",
      data,
    })
  } catch (error) {
    console.error("❌ Load from file error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to load questions from file",
      error: error.message,
    })
  }
}

/**
 * Delete question files
 */
export const deleteQuestionFilesHandler = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const { filename } = req.query

    const result = await deleteAssessmentQuestions(assessmentId, filename)

    res.json({
      success: true,
      message: filename ? "File deleted successfully" : "All question files deleted successfully",
      data: result,
    })
  } catch (error) {
    console.error("❌ Delete question files error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete question files",
      error: error.message,
    })
  }
}
