import {
  saveQuestionToBank,
  searchQuestionBank,
  getQuestionFromBank,
  updateQuestionInBank,
  deleteQuestionFromBank,
  importQuestionsToBank,
  getQuestionBankStats,
  getPopularTags
} from "../models/questionBankModel.js"

/**
 * Question Bank Controller
 * Handles CRUD operations, search, and import functionality for question bank
 */

/**
 * Save question to bank
 * @route POST /api/question-bank/save
 */
export const saveQuestion = async (req, res) => {
  try {
    const instructorId = req.user.id
    const questionData = req.body

    console.log(`💾 Saving question to bank for instructor ${instructorId}`)

    // Validate required fields
    const requiredFields = ['question_text', 'question_type', 'difficulty_level']
    const missingFields = requiredFields.filter(field => !questionData[field])
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      })
    }

    const savedQuestion = await saveQuestionToBank(questionData, instructorId)

    res.status(201).json({
      success: true,
      message: "Question saved to bank successfully",
      data: savedQuestion
    })
  } catch (error) {
    console.error("❌ Save question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to save question to bank",
      error: error.message
    })
  }
}

/**
 * Search questions in bank
 * @route GET /api/question-bank/search
 */
export const searchQuestions = async (req, res) => {
  try {
    const instructorId = req.user.id
    const searchParams = req.query

    console.log(`🔍 Searching question bank for instructor ${instructorId}`)

    const result = await searchQuestionBank(searchParams, instructorId)

    res.status(200).json({
      success: true,
      message: "Question search completed successfully",
      data: result
    })
  } catch (error) {
    console.error("❌ Search questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to search questions",
      error: error.message
    })
  }
}

/**
 * Get question by ID from bank
 * @route GET /api/question-bank/:id
 */
export const getQuestion = async (req, res) => {
  try {
    const questionId = parseInt(req.params.id)
    const instructorId = req.user.id

    console.log(`📖 Getting question ${questionId} from bank`)

    const question = await getQuestionFromBank(questionId, instructorId)

    res.status(200).json({
      success: true,
      message: "Question retrieved successfully",
      data: question
    })
  } catch (error) {
    console.error("❌ Get question error:", error)
    res.status(404).json({
      success: false,
      message: "Question not found",
      error: error.message
    })
  }
}

/**
 * Update question in bank
 * @route PUT /api/question-bank/:id
 */
export const updateQuestion = async (req, res) => {
  try {
    const questionId = parseInt(req.params.id)
    const instructorId = req.user.id
    const updateData = req.body

    console.log(`✏️ Updating question ${questionId} in bank`)

    const updatedQuestion = await updateQuestionInBank(questionId, updateData, instructorId)

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion
    })
  } catch (error) {
    console.error("❌ Update question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: error.message
    })
  }
}

/**
 * Delete question from bank
 * @route DELETE /api/question-bank/:id
 */
export const deleteQuestion = async (req, res) => {
  try {
    const questionId = parseInt(req.params.id)
    const instructorId = req.user.id

    console.log(`🗑️ Deleting question ${questionId} from bank`)

    await deleteQuestionFromBank(questionId, instructorId)

    res.status(200).json({
      success: true,
      message: "Question deleted successfully"
    })
  } catch (error) {
    console.error("❌ Delete question error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
      error: error.message
    })
  }
}

/**
 * Import questions from assessment to bank
 * @route POST /api/question-bank/import/:assessmentId
 */
export const importQuestions = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    const instructorId = req.user.id
    const { questionIds } = req.body

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid question IDs array is required"
      })
    }

    console.log(`📥 Importing ${questionIds.length} questions to bank from assessment ${assessmentId}`)

    const results = await importQuestionsToBank(assessmentId, instructorId, questionIds)

    res.status(200).json({
      success: true,
      message: `Import completed. ${results.imported.length} imported, ${results.skipped.length} skipped, ${results.errors.length} errors`,
      data: results
    })
  } catch (error) {
    console.error("❌ Import questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to import questions",
      error: error.message
    })
  }
}

/**
 * Get question bank statistics
 * @route GET /api/question-bank/stats
 */
export const getStats = async (req, res) => {
  try {
    const instructorId = req.user.id

    console.log(`📊 Getting question bank stats for instructor ${instructorId}`)

    const stats = await getQuestionBankStats(instructorId)

    res.status(200).json({
      success: true,
      message: "Question bank statistics retrieved successfully",
      data: stats
    })
  } catch (error) {
    console.error("❌ Get stats error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve question bank statistics",
      error: error.message
    })
  }
}

/**
 * Get popular tags
 * @route GET /api/question-bank/tags
 */
export const getTags = async (req, res) => {
  try {
    const instructorId = req.user.id
    const { limit = 10 } = req.query

    console.log(`🏷️ Getting popular tags for instructor ${instructorId}`)

    const tags = await getPopularTags(instructorId, parseInt(limit))

    res.status(200).json({
      success: true,
      message: "Popular tags retrieved successfully",
      data: tags
    })
  } catch (error) {
    console.error("❌ Get tags error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve popular tags",
      error: error.message
    })
  }
}

/**
 * Bulk save questions to bank
 * @route POST /api/question-bank/bulk-save
 */
export const bulkSaveQuestions = async (req, res) => {
  try {
    const instructorId = req.user.id
    const { questions } = req.body

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid questions array is required"
      })
    }

    console.log(`💾 Bulk saving ${questions.length} questions to bank for instructor ${instructorId}`)

    const results = {
      saved: [],
      failed: [],
      total: questions.length
    }

    for (const questionData of questions) {
      try {
        const savedQuestion = await saveQuestionToBank(questionData, instructorId)
        results.saved.push(savedQuestion)
      } catch (error) {
        results.failed.push({
          question: questionData.question_text,
          error: error.message
        })
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk save completed. ${results.saved.length} saved, ${results.failed.length} failed`,
      data: results
    })
  } catch (error) {
    console.error("❌ Bulk save questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to bulk save questions",
      error: error.message
    })
  }
}

/**
 * Export questions from bank
 * @route GET /api/question-bank/export
 */
export const exportQuestions = async (req, res) => {
  try {
    const instructorId = req.user.id
    const { format = 'json' } = req.query

    console.log(`📤 Exporting questions from bank for instructor ${instructorId}`)

    // Get all questions for instructor
    const result = await searchQuestionBank({ limit: 1000 }, instructorId)
    const questions = result.questions

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'Question Text',
        'Question Type',
        'Difficulty Level',
        'Topics',
        'Options',
        'Correct Answer',
        'Explanation',
        'Marks',
        'Tags',
        'Created At'
      ]

      const csvRows = [
        headers.join(','),
        ...questions.map(q => [
          `"${q.question_text}"`,
          q.question_type,
          q.difficulty_level,
          `"${(q.topics || []).join('; ')}"`,
          `"${JSON.stringify(q.options || [])}"`,
          `"${q.correct_answer}"`,
          `"${q.explanation || ''}"`,
          q.marks_per_question,
          `"${(q.tags || []).join('; ')}"`,
          q.created_at
        ].join(','))
      ]

      const csvData = csvRows.join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="question-bank-${instructorId}.csv"`)
      return res.send(csvData)
    }

    res.status(200).json({
      success: true,
      message: "Questions exported successfully",
      data: {
        total_questions: questions.length,
        questions: questions
      }
    })
  } catch (error) {
    console.error("❌ Export questions error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to export questions",
      error: error.message
    })
  }
}

