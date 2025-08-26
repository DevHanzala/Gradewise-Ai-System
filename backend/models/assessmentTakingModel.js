import db from "../DB/db.js"

/**
 * Assessment Taking Model
 * Handles student assessment attempts, timing, autosave, and resume functionality
 */

/**
 * Start a new assessment attempt
 * @param {number} assessmentId - Assessment ID
 * @param {number} studentId - Student ID
 * @returns {Object} Attempt data with start time
 */
export const startAssessmentAttempt = async (assessmentId, studentId) => {
  try {
    console.log(`🚀 Starting assessment attempt for student ${studentId} on assessment ${assessmentId}`)

    // Check if student is enrolled
    const enrollmentCheck = await db.query(
      "SELECT * FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2",
      [assessmentId, studentId]
    )

    if (enrollmentCheck.rows.length === 0) {
      throw new Error("Student not enrolled in this assessment")
    }

    // Check attempt limits
    const attemptCount = await db.query(
      "SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = $1 AND student_id = $2",
      [assessmentId, studentId]
    )

    // Get assessment details for availability and attempt limits
    const assessment = await db.query(
      "SELECT duration, passing_marks, is_published, start_date, end_date FROM assessments WHERE id = $1",
      [assessmentId]
    )

    if (assessment.rows.length === 0) {
      throw new Error("Assessment not found")
    }

    const assessmentData = assessment.rows[0]
    const duration = assessmentData.duration || 60

    // Check if assessment is published
    if (!assessmentData.is_published) {
      throw new Error("Assessment is not published yet")
    }

    // Check if assessment is within valid date range
    const now = new Date()
    if (assessmentData.start_date && new Date(assessmentData.start_date) > now) {
      throw new Error("Assessment has not started yet")
    }

    if (assessmentData.end_date && new Date(assessmentData.end_date) < now) {
      throw new Error("Assessment has expired")
    }

    // Check if there's an incomplete attempt that can be resumed
    const incompleteAttempt = await db.query(
      "SELECT * FROM assessment_attempts WHERE assessment_id = $1 AND student_id = $2 AND submitted_at IS NULL ORDER BY start_time DESC LIMIT 1",
      [assessmentId, studentId]
    )

    if (incompleteAttempt.rows.length > 0) {
      const attempt = incompleteAttempt.rows[0]
      const timeElapsed = Math.floor((Date.now() - new Date(attempt.start_time).getTime()) / 1000)

      if (timeElapsed < duration * 60) {
        console.log(`🔄 Resuming incomplete attempt ${attempt.id}`)
        return {
          attempt_id: attempt.id,
          resumed: true,
          time_remaining: (duration * 60) - timeElapsed,
          start_time: attempt.start_time
        }
      }
    }

    // Create new attempt
    const newAttempt = await db.query(
      `INSERT INTO assessment_attempts (
        assessment_id, 
        student_id, 
        start_time,
        status
      ) VALUES ($1, $2, NOW(), 'in_progress') RETURNING *`,
      [assessmentId, studentId]
    )

    console.log(`✅ New assessment attempt started: ${newAttempt.rows[0].id}`)
    return {
      attempt_id: newAttempt.rows[0].id,
      resumed: false,
      time_remaining: duration * 60,
      start_time: newAttempt.rows[0].start_time
    }
  } catch (error) {
    console.error("❌ Error starting assessment attempt:", error)
    throw error
  }
}


/**
 * Save student's current progress (autosave)
 * @param {number} attemptId - Attempt ID
 * @param {Array} answers - Array of student answers
 * @param {number} currentQuestion - Current question number
 * @returns {boolean} Success status
 */
export const saveProgress = async (attemptId, answers, currentQuestion) => {
  try {
    console.log(`💾 Saving progress for attempt ${attemptId}`)

    // Update attempt with current progress
    await db.query(
      "UPDATE assessment_attempts SET last_saved = NOW(), current_question = $1 WHERE id = $2",
      [currentQuestion, attemptId]
    )

    // Save individual answers
    for (const answer of answers) {
      const { question_id, answer_text, selected_options } = answer
      
      // Check if answer already exists
      const existingAnswer = await db.query(
        "SELECT id FROM student_answers WHERE attempt_id = $1 AND question_id = $2",
        [attemptId, question_id]
      )

      if (existingAnswer.rows.length > 0) {
        // Update existing answer
        await db.query(
          `UPDATE student_answers 
           SET answer_text = $1, selected_options = $2, updated_at = NOW() 
           WHERE attempt_id = $3 AND question_id = $4`,
          [answer_text, selected_options, attemptId, question_id]
        )
      } else {
        // Insert new answer
        await db.query(
          `INSERT INTO student_answers (
            attempt_id, 
            question_id, 
            answer_text, 
            selected_options, 
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [attemptId, question_id, answer_text, selected_options]
        )
      }
    }

    console.log(`✅ Progress saved successfully for attempt ${attemptId}`)
    return true
  } catch (error) {
    console.error("❌ Error saving progress:", error)
    throw error
  }
}

/**
 * Submit assessment attempt
 * @param {number} attemptId - Attempt ID
 * @param {Array} finalAnswers - Final array of student answers
 * @returns {Object} Submission result
 */
export const submitAssessment = async (attemptId, finalAnswers) => {
  try {
    console.log(`📝 Submitting assessment attempt ${attemptId}`)

    // Check attempt exists
    const attempt = await db.query(
      "SELECT * FROM assessment_attempts WHERE id = $1",
      [attemptId]
    )

    if (attempt.rows.length === 0) {
      throw new Error("Attempt not found")
    }

    // Save final answers first
    await saveProgress(attemptId, finalAnswers, finalAnswers.length)

    // Let DB calculate time_taken automatically
    const result = await db.query(
      `UPDATE assessment_attempts 
       SET submitted_at = NOW(),
           time_taken = EXTRACT(EPOCH FROM (NOW() - start_time))::INT,
           status = 'submitted'
       WHERE id = $1
       RETURNING id, submitted_at, time_taken`,
      [attemptId]
    )

    const updatedAttempt = result.rows[0]
    console.log(`✅ Assessment submitted successfully. Time taken: ${updatedAttempt.time_taken} seconds`)

    return {
      attempt_id: updatedAttempt.id,
      time_taken: updatedAttempt.time_taken,
      submitted_at: updatedAttempt.submitted_at
    }
  } catch (error) {
    console.error("❌ Error submitting assessment:", error)
    throw error
  }
}


/**
 * Get student's current attempt progress
 * @param {number} attemptId - Attempt ID
 * @returns {Object} Attempt progress data
 */
export const getAttemptProgress = async (attemptId) => {
  try {
    console.log(`📊 Getting progress for attempt ${attemptId}`)

    const attempt = await db.query(
      "SELECT * FROM assessment_attempts WHERE id = $1",
      [attemptId]
    )

    if (attempt.rows.length === 0) {
      throw new Error("Attempt not found")
    }

    const answers = await db.query(
      "SELECT * FROM student_answers WHERE attempt_id = $1 ORDER BY question_id",
      [attemptId]
    )

    return {
      attempt: attempt.rows[0],
      answers: answers.rows,
      progress_percentage: Math.round((answers.rows.length / 10) * 100) // Assuming 10 questions
    }
  } catch (error) {
    console.error("❌ Error getting attempt progress:", error)
    throw error
  }
}

/**
 * Check if attempt can be resumed
 * @param {number} assessmentId - Assessment ID
 * @param {number} studentId - Student ID
 * @returns {Object} Resume status
 */
export const checkResumeStatus = async (assessmentId, studentId) => {
  try {
    const incompleteAttempt = await db.query(
      "SELECT * FROM assessment_attempts WHERE assessment_id = $1 AND student_id = $2 AND submitted_at IS NULL ORDER BY start_time DESC LIMIT 1",
      [assessmentId, studentId]
    )

    if (incompleteAttempt.rows.length === 0) {
      return { can_resume: false }
    }

    const attempt = incompleteAttempt.rows[0]
    const assessment = await db.query(
      "SELECT duration FROM assessments WHERE id = $1",
      [assessmentId]
    )

    const duration = assessment.rows[0].duration || 60
    const timeElapsed = Math.floor((Date.now() - new Date(attempt.start_time).getTime()) / 1000)
    const timeRemaining = (duration * 60) - timeElapsed

    return {
      can_resume: timeRemaining > 0,
      attempt_id: attempt.id,
      time_remaining: Math.max(0, timeRemaining),
      start_time: attempt.start_time
    }
  } catch (error) {
    console.error("❌ Error checking resume status:", error)
    throw error
  }
}
