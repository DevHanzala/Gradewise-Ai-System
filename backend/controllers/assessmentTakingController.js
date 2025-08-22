import {
  createAssessmentSession,
  getAssessmentSession,
  saveStudentAnswer,
  submitAssessment,
  getActiveSession,
  getSubmission,
  getAssessmentSubmissions,
} from "../services/assessmentTakingService.js"
import { getAssessmentById } from "../models/assessmentModel.js"
import { loadQuestionsFromFile, getAssessmentQuestionFiles } from "../services/aiService.js"
import pool from "../DB/db.js"

// Start assessment (create session)
export const startAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const studentId = req.user.id

    console.log("🚀 Starting assessment:", assessmentId, "for student:", studentId)

    // Get assessment details
    const assessment = await getAssessmentById(assessmentId)
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      })
    }

    // Check if student is enrolled
    const enrollmentCheck = await pool.query(
      "SELECT id FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2",
      [assessmentId, studentId],
    )

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this assessment",
      })
    }

    // Check if assessment is published and within time bounds
    if (!assessment.is_published) {
      return res.status(400).json({
        success: false,
        message: "Assessment is not published yet",
      })
    }

    const now = new Date()
    if (assessment.start_date && new Date(assessment.start_date) > now) {
      return res.status(400).json({
        success: false,
        message: "Assessment has not started yet",
      })
    }

    if (assessment.end_date && new Date(assessment.end_date) < now) {
      return res.status(400).json({
        success: false,
        message: "Assessment has ended",
      })
    }

    // Check if student already has an active session
    const activeSession = await getActiveSession(assessmentId, studentId)
    if (activeSession) {
      console.log("📝 Returning existing active session")
      return res.status(200).json({
        success: true,
        message: "Resuming existing session",
        data: {
          session_id: activeSession.session_id,
          time_remaining: activeSession.time_remaining,
          current_question: activeSession.current_question,
          total_questions: activeSession.total_questions,
        },
      })
    }

    // Check if student has already submitted
    const submissionCheck = await pool.query(
      "SELECT id FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2 AND status = 'completed'",
      [assessmentId, studentId],
    )

    if (submissionCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already completed this assessment",
      })
    }

    // Load questions for the assessment
    const questionFiles = await getAssessmentQuestionFiles(assessmentId)
    if (questionFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No questions found for this assessment",
      })
    }

    const allQuestions = []
    for (const fileInfo of questionFiles) {
      const questions = await loadQuestionsFromFile(assessmentId, fileInfo.block_title)
      allQuestions.push(...questions)
    }

    if (allQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No questions available for this assessment",
      })
    }

    // Shuffle questions for randomization
    const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5)

    // Create assessment session
    const session = await createAssessmentSession(assessmentId, studentId, shuffledQuestions, assessment.duration)

    console.log("✅ Assessment session created successfully")

    res.status(201).json({
      success: true,
      message: "Assessment started successfully",
      data: {
        session_id: session.session_id,
        assessment_title: assessment.title,
        duration_minutes: assessment.duration,
        total_questions: session.total_questions,
        time_remaining: session.time_remaining,
        start_time: session.start_time,
        end_time: session.end_time,
      },
    })
  } catch (error) {
    console.error("❌ Start assessment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to start assessment",
    })
  }
}

// Get assessment session details
export const getAssessmentSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params
    const studentId = req.user.id

    console.log("📖 Getting session details:", sessionId)

    const session = await getAssessmentSession(sessionId)
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      })
    }

    // Check if session belongs to the student
    if (session.student_id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    // Return session details without showing correct answers
    const sessionDetails = {
      session_id: session.session_id,
      assessment_id: session.assessment_id,
      status: session.status,
      start_time: session.start_time,
      end_time: session.end_time,
      time_remaining: session.time_remaining,
      current_question: session.current_question,
      total_questions: session.total_questions,
      questions: session.questions.map((q) => ({
        id: q.id,
        question_number: q.question_number,
        question: q.question,
        type: q.type,
        marks: q.marks,
        options: q.options,
        student_answer: q.student_answer,
        is_answered: q.is_answered,
        // Don't send correct_answer or explanation during active session
      })),
    }

    res.status(200).json({
      success: true,
      data: sessionDetails,
    })
  } catch (error) {
    console.error("❌ Get session details error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get session details",
    })
  }
}

// Save answer for a question
export const saveAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params
    const { questionNumber, answer, timeSpent = 0 } = req.body
    const studentId = req.user.id

    console.log("💾 Saving answer for session:", sessionId, "question:", questionNumber)

    const session = await getAssessmentSession(sessionId)
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      })
    }

    // Check if session belongs to the student
    if (session.student_id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Session is not active",
      })
    }

    const updatedSession = await saveStudentAnswer(sessionId, questionNumber, answer, timeSpent)

    res.status(200).json({
      success: true,
      message: "Answer saved successfully",
      data: {
        question_number: questionNumber,
        answer: answer,
        time_remaining: updatedSession.time_remaining,
      },
    })
  } catch (error) {
    console.error("❌ Save answer error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to save answer",
    })
  }
}

// Submit assessment
export const submitAssessmentController = async (req, res) => {
  try {
    const { sessionId } = req.params
    const studentId = req.user.id

    console.log("🎯 Submitting assessment for session:", sessionId)

    const session = await getAssessmentSession(sessionId)
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      })
    }

    // Check if session belongs to the student
    if (session.student_id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    const submission = await submitAssessment(sessionId)

    // Update enrollment status
    await pool.query(
      "UPDATE assessment_enrollments SET status = 'completed', score = $1, completed_at = CURRENT_TIMESTAMP WHERE assessment_id = $2 AND student_id = $3",
      [submission.percentage, session.assessment_id, studentId],
    )

    console.log("✅ Assessment submitted successfully")

    res.status(200).json({
      success: true,
      message: "Assessment submitted successfully",
      data: {
        submission_id: submission.submission_id,
        total_questions: submission.total_questions,
        answered_questions: submission.answered_questions,
        total_marks: submission.total_marks,
        scored_marks: submission.scored_marks,
        percentage: submission.percentage,
        duration_taken: submission.duration_taken,
        needs_manual_grading: submission.needs_manual_grading,
      },
    })
  } catch (error) {
    console.error("❌ Submit assessment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit assessment",
    })
  }
}

// Get submission details
export const getSubmissionDetails = async (req, res) => {
  try {
    const { submissionId } = req.params
    const studentId = req.user.id

    console.log("📊 Getting submission details:", submissionId)

    const submission = await getSubmission(submissionId)
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      })
    }

    // Check if submission belongs to the student (or instructor/admin)
    if (req.user.role === "student" && submission.student_id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      })
    }

    res.status(200).json({
      success: true,
      data: submission,
    })
  } catch (error) {
    console.error("❌ Get submission details error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get submission details",
    })
  }
}

// Get all submissions for an assessment (instructor/admin only)
export const getAssessmentSubmissionsController = async (req, res) => {
  try {
    const { assessmentId } = req.params

    console.log("📊 Getting submissions for assessment:", assessmentId)

    // Check if user has access to this assessment
    if (req.user.role === "instructor") {
      const assessment = await getAssessmentById(assessmentId)
      if (!assessment || assessment.instructor_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        })
      }
    }

    const submissions = await getAssessmentSubmissions(assessmentId)

    res.status(200).json({
      success: true,
      data: submissions,
    })
  } catch (error) {
    console.error("❌ Get assessment submissions error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get submissions",
    })
  }
}
