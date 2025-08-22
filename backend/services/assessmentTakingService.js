import fs from "fs"
import path from "path"

// Create assessment sessions storage directory
const sessionsDir = path.join(process.cwd(), "storage", "sessions")
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true })
}

// Create submissions storage directory
const submissionsDir = path.join(process.cwd(), "storage", "submissions")
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true })
}

/**
 * Create a new assessment session
 * @param {string} assessmentId - Assessment ID
 * @param {string} studentId - Student ID
 * @param {Array} questions - Assessment questions
 * @param {number} duration - Assessment duration in minutes
 * @returns {Promise<Object>} Session data
 */
export const createAssessmentSession = async (assessmentId, studentId, questions, duration) => {
  try {
    const sessionId = `session_${assessmentId}_${studentId}_${Date.now()}`
    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

    const sessionData = {
      session_id: sessionId,
      assessment_id: assessmentId,
      student_id: studentId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: duration,
      status: "active",
      current_question: 0,
      total_questions: questions.length,
      questions: questions.map((q, index) => ({
        ...q,
        question_number: index + 1,
        student_answer: null,
        is_answered: false,
        time_spent: 0,
      })),
      answers: {},
      time_remaining: duration * 60, // in seconds
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    }

    const fileName = `${sessionId}.json`
    const filePath = path.join(sessionsDir, fileName)

    await fs.promises.writeFile(filePath, JSON.stringify(sessionData, null, 2))

    console.log(`📝 Assessment session created: ${sessionId}`)
    return sessionData
  } catch (error) {
    console.error("❌ Error creating assessment session:", error)
    throw new Error("Failed to create assessment session")
  }
}

/**
 * Get assessment session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} Session data or null
 */
export const getAssessmentSession = async (sessionId) => {
  try {
    const fileName = `${sessionId}.json`
    const filePath = path.join(sessionsDir, fileName)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = await fs.promises.readFile(filePath, "utf8")
    const sessionData = JSON.parse(data)

    // Check if session has expired
    const now = new Date()
    const endTime = new Date(sessionData.end_time)

    if (now > endTime && sessionData.status === "active") {
      sessionData.status = "expired"
      sessionData.time_remaining = 0
      await updateAssessmentSession(sessionId, sessionData)
    }

    return sessionData
  } catch (error) {
    console.error("❌ Error getting assessment session:", error)
    return null
  }
}

/**
 * Update assessment session
 * @param {string} sessionId - Session ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated session data
 */
export const updateAssessmentSession = async (sessionId, updateData) => {
  try {
    const fileName = `${sessionId}.json`
    const filePath = path.join(sessionsDir, fileName)

    updateData.last_activity = new Date().toISOString()

    await fs.promises.writeFile(filePath, JSON.stringify(updateData, null, 2))

    console.log(`📝 Assessment session updated: ${sessionId}`)
    return updateData
  } catch (error) {
    console.error("❌ Error updating assessment session:", error)
    throw new Error("Failed to update assessment session")
  }
}

/**
 * Save student answer
 * @param {string} sessionId - Session ID
 * @param {number} questionNumber - Question number (1-based)
 * @param {string} answer - Student's answer
 * @param {number} timeSpent - Time spent on question in seconds
 * @returns {Promise<Object>} Updated session data
 */
export const saveStudentAnswer = async (sessionId, questionNumber, answer, timeSpent = 0) => {
  try {
    const sessionData = await getAssessmentSession(sessionId)
    if (!sessionData) {
      throw new Error("Session not found")
    }

    if (sessionData.status !== "active") {
      throw new Error("Session is not active")
    }

    // Update the specific question
    const questionIndex = questionNumber - 1
    if (questionIndex >= 0 && questionIndex < sessionData.questions.length) {
      sessionData.questions[questionIndex].student_answer = answer
      sessionData.questions[questionIndex].is_answered = true
      sessionData.questions[questionIndex].time_spent += timeSpent
    }

    // Update answers object for quick access
    sessionData.answers[questionNumber] = {
      answer: answer,
      answered_at: new Date().toISOString(),
      time_spent: timeSpent,
    }

    // Update current question if moving forward
    if (questionNumber > sessionData.current_question) {
      sessionData.current_question = questionNumber
    }

    // Calculate time remaining
    const now = new Date()
    const endTime = new Date(sessionData.end_time)
    sessionData.time_remaining = Math.max(0, Math.floor((endTime - now) / 1000))

    const updatedSession = await updateAssessmentSession(sessionId, sessionData)

    console.log(`💾 Answer saved for question ${questionNumber} in session ${sessionId}`)
    return updatedSession
  } catch (error) {
    console.error("❌ Error saving student answer:", error)
    throw new Error("Failed to save answer")
  }
}

/**
 * Submit assessment
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Submission data
 */
export const submitAssessment = async (sessionId) => {
  try {
    const sessionData = await getAssessmentSession(sessionId)
    if (!sessionData) {
      throw new Error("Session not found")
    }

    if (sessionData.status === "submitted") {
      throw new Error("Assessment already submitted")
    }

    // Mark session as submitted
    sessionData.status = "submitted"
    sessionData.submitted_at = new Date().toISOString()

    // Calculate basic score (this will be enhanced with AI evaluation later)
    let totalMarks = 0
    let scoredMarks = 0
    let answeredQuestions = 0

    sessionData.questions.forEach((question) => {
      totalMarks += question.marks || 1

      if (question.is_answered) {
        answeredQuestions++

        // Basic scoring for multiple choice questions
        if (question.type === "multiple_choice" && question.correct_answer) {
          if (question.student_answer === question.correct_answer) {
            scoredMarks += question.marks || 1
          }
        }
        // For other question types, we'll need AI evaluation (to be implemented)
      }
    })

    const submissionData = {
      submission_id: `sub_${sessionData.assessment_id}_${sessionData.student_id}_${Date.now()}`,
      session_id: sessionId,
      assessment_id: sessionData.assessment_id,
      student_id: sessionData.student_id,
      submitted_at: sessionData.submitted_at,
      duration_taken: Math.floor((new Date(sessionData.submitted_at) - new Date(sessionData.start_time)) / 1000 / 60), // in minutes
      total_questions: sessionData.total_questions,
      answered_questions: answeredQuestions,
      total_marks: totalMarks,
      scored_marks: scoredMarks,
      percentage: totalMarks > 0 ? Math.round((scoredMarks / totalMarks) * 100) : 0,
      answers: sessionData.answers,
      questions_with_answers: sessionData.questions,
      status: "submitted",
      needs_manual_grading: sessionData.questions.some((q) => q.type !== "multiple_choice"),
    }

    // Save submission
    const submissionFileName = `${submissionData.submission_id}.json`
    const submissionFilePath = path.join(submissionsDir, submissionFileName)
    await fs.promises.writeFile(submissionFilePath, JSON.stringify(submissionData, null, 2))

    // Update session
    await updateAssessmentSession(sessionId, sessionData)

    console.log(`🎯 Assessment submitted: ${submissionData.submission_id}`)
    return submissionData
  } catch (error) {
    console.error("❌ Error submitting assessment:", error)
    throw new Error("Failed to submit assessment")
  }
}

/**
 * Get student's active session for an assessment
 * @param {string} assessmentId - Assessment ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Active session or null
 */
export const getActiveSession = async (assessmentId, studentId) => {
  try {
    const files = await fs.promises.readdir(sessionsDir)
    const sessionFiles = files.filter((file) => file.startsWith(`session_${assessmentId}_${studentId}_`))

    for (const file of sessionFiles) {
      try {
        const filePath = path.join(sessionsDir, file)
        const data = await fs.promises.readFile(filePath, "utf8")
        const sessionData = JSON.parse(data)

        if (sessionData.status === "active") {
          // Check if session has expired
          const now = new Date()
          const endTime = new Date(sessionData.end_time)

          if (now > endTime) {
            sessionData.status = "expired"
            sessionData.time_remaining = 0
            await updateAssessmentSession(sessionData.session_id, sessionData)
            continue
          }

          return sessionData
        }
      } catch (error) {
        console.error(`Error reading session file ${file}:`, error)
      }
    }

    return null
  } catch (error) {
    console.error("❌ Error getting active session:", error)
    return null
  }
}

/**
 * Get submission by ID
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object|null>} Submission data or null
 */
export const getSubmission = async (submissionId) => {
  try {
    const fileName = `${submissionId}.json`
    const filePath = path.join(submissionsDir, fileName)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = await fs.promises.readFile(filePath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error("❌ Error getting submission:", error)
    return null
  }
}

/**
 * Get all submissions for an assessment
 * @param {string} assessmentId - Assessment ID
 * @returns {Promise<Array>} Array of submissions
 */
export const getAssessmentSubmissions = async (assessmentId) => {
  try {
    const files = await fs.promises.readdir(submissionsDir)
    const submissionFiles = files.filter((file) => file.includes(`_${assessmentId}_`))

    const submissions = []

    for (const file of submissionFiles) {
      try {
        const filePath = path.join(submissionsDir, file)
        const data = await fs.promises.readFile(filePath, "utf8")
        const submissionData = JSON.parse(data)
        submissions.push(submissionData)
      } catch (error) {
        console.error(`Error reading submission file ${file}:`, error)
      }
    }

    return submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  } catch (error) {
    console.error("❌ Error getting assessment submissions:", error)
    return []
  }
}
