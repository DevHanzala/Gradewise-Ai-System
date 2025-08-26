import {
  startAssessmentAttempt,
  saveProgress,
  submitAssessment,
  getAttemptProgress,
  checkResumeStatus
} from "../models/assessmentTakingModel.js"
import pool from "../DB/db.js"

/**
 * Assessment Taking Controller
 * Handles all assessment taking related API endpoints
 */

/**
 * Start a new assessment attempt
 * @route POST /api/assessments/:id/start
 */
export const startAttempt = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id)
    const studentId = req.user.id

    console.log(`🚀 Student ${studentId} starting assessment ${assessmentId}`)

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can take assessments"
      })
    }

    // Start or resume attempt (includes availability checks)
    const attemptData = await startAssessmentAttempt(assessmentId, studentId)

    // Fetch minimal assessment details
    const assessmentResult = await pool.query(
      `SELECT id, title, description, duration, total_marks, passing_marks, is_published, start_date, end_date
       FROM assessments WHERE id = $1`,
      [assessmentId]
    )

    const assessment = assessmentResult.rows[0] || null

    // Fetch questions, if any have been generated and stored
    // We rely on generated_questions table; if absent/empty, return an empty list
    let questions = []
    try {
      const questionsResult = await pool.query(
        `SELECT gq.id,
                gq.question_text,
                gq.question_type,
                gq.options,
                gq.correct_answer,
                gq.explanation,
                gq.marks AS marks,
                gq.question_order,
                qb.block_title
           FROM generated_questions gq
           JOIN question_blocks qb ON qb.id = gq.block_id
          WHERE qb.assessment_id = $1
          ORDER BY qb.block_order NULLS LAST, gq.question_order ASC, gq.id ASC`,
        [assessmentId]
      )
      questions = questionsResult.rows || []
    } catch (qErr) {
      console.warn("⚠️ Unable to load generated questions (may not exist yet):", qErr.message)
      questions = []
    }

    return res.status(200).json({
      success: true,
      message: attemptData.resumed ? "Resuming previous attempt" : "Assessment attempt started",
      data: {
        ...attemptData,
        assessment,
        questions
      }
    })
  } catch (error) {
    console.error("❌ Start attempt error:", error)

    // Map common errors to clearer messages
    let message = error.message || "Failed to start assessment attempt"
    if (message.includes("not enrolled")) {
      message = "You are not enrolled in this assessment. Please contact your instructor."
    }
    if (message.includes("not published")) {
      message = "This assessment is not published yet."
    }
    if (message.includes("not started")) {
      message = "This assessment has not started yet."
    }
    if (message.includes("expired")) {
      message = "This assessment has expired."
    }

    res.status(400).json({
      success: false,
      message
    })
  }
}

/**
 * Save progress during assessment (autosave)
 * @route POST /api/assessments/attempt/:attemptId/save
 */
export const saveAttemptProgress = async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId)
    const { answers, currentQuestion } = req.body
    const studentId = req.user.id

    console.log(`💾 Saving progress for attempt ${attemptId} by student ${studentId}`)

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can save assessment progress"
      })
    }

    // Verify the attempt belongs to the student
    const attemptCheck = await pool.query(
      "SELECT student_id FROM assessment_attempts WHERE id = $1",
      [attemptId]
    )

    if (attemptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found"
      })
    }

    if (attemptCheck.rows[0].student_id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only save progress for your own attempts"
      })
    }

    await saveProgress(attemptId, answers, currentQuestion)

    res.status(200).json({
      success: true,
      message: "Progress saved successfully",
      data: { saved_at: new Date() }
    })
  } catch (error) {
    console.error("❌ Save progress error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to save progress",
      error: error.message
    })
  }
}

/**
 * Submit assessment attempt
 * @route POST /api/assessments/attempt/:attemptId/submit
 */
export const submitAttempt = async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId)
    const { answers } = req.body
    const studentId = req.user.id

    console.log(`📨 Submitting attempt ${attemptId} by student ${studentId}`)

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can submit assessments"
      })
    }

    // Verify the attempt belongs to the student
    const attemptCheck = await pool.query(
      "SELECT student_id FROM assessment_attempts WHERE id = $1",
      [attemptId]
    )

    if (attemptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found"
      })
    }

    if (attemptCheck.rows[0].student_id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only submit your own attempts"
      })
    }

    // Submit attempt using model (handles time_taken in SQL)
    const result = await submitAssessment(attemptId, answers)

    res.status(200).json({
      success: true,
      message: "Assessment submitted successfully",
      data: result
    })
  } catch (error) {
    console.error("❌ Submit attempt error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to submit assessment",
      error: error.message
    })
  }
}

/**
 * Get attempt progress
 * @route GET /api/assessments/attempt/:attemptId/progress
 */
export const getProgress = async (req, res) => {
  try {
    const attemptId = parseInt(req.params.attemptId)
    const progress = await getAttemptProgress(attemptId)

    res.status(200).json({
      success: true,
      message: "Attempt progress retrieved successfully",
      data: progress
    })
  } catch (error) {
    console.error("❌ Get progress error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve progress",
      error: error.message
    })
  }
}

/**
 * Check resume status for an assessment
 * @route GET /api/assessments/:id/resume-status
 */
export const getResumeStatus = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id)
    const studentId = req.user.id

    const status = await checkResumeStatus(assessmentId, studentId)

    res.status(200).json({
      success: true,
      message: "Resume status retrieved successfully",
      data: status
    })
  } catch (error) {
    console.error("❌ Get resume status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve resume status",
      error: error.message
    })
  }
}

/**
 * Get timer info for an assessment
 * @route GET /api/assessments/:id/timer
 */
export const getTimerInfo = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id)
    const studentId = req.user.id

    // Get latest attempt (in progress)
    const { rows } = await pool.query(
      `SELECT id, start_time, status
         FROM assessment_attempts
        WHERE assessment_id = $1 AND student_id = $2
        ORDER BY start_time DESC
        LIMIT 1`,
      [assessmentId, studentId]
    )

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attempt found for this assessment"
      })
    }

    res.status(200).json({
      success: true,
      message: "Timer info retrieved successfully",
      data: rows[0]
    })
  } catch (error) {
    console.error("❌ Get timer info error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve timer info",
      error: error.message
    })
  }
}
