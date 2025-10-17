import db from "../DB/db.js";
import { getCreationModel, getCheckingModel, mapLanguageCode, generateContent } from "../services/geminiService.js";
import { generateAssessmentQuestions } from "../models/assessmentModel.js";

const checkAnswer = (questionType, studentAnswer, correctAnswer) => {
  if (studentAnswer === undefined || studentAnswer === null) return false;
  switch (questionType) {
    case "multiple_choice":
      return studentAnswer === correctAnswer;
    case "true_false":
      return studentAnswer === correctAnswer;
    case "matching":
      if (!Array.isArray(studentAnswer) || !Array.isArray(correctAnswer)) return false;
      if (studentAnswer.length !== correctAnswer.length) return false;
      return studentAnswer.every((ans, i) => ans[1] === correctAnswer[i][1]);
    case "short_answer":
      return studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    default:
      return false;
  }
};

export const startAssessmentForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { assessmentId } = req.params;
    const { language = "en" } = req.body || {};

    console.log(`📝 Starting assessment ${assessmentId} for student ${studentId} in language ${language}`);

    // Check if assessment exists
    const { rows: assessRows } = await db.query(
      `SELECT id, title, prompt, external_links, is_executed
       FROM assessments WHERE id = $1`,
      [assessmentId]
    );
    if (assessRows.length === 0) {
      console.warn(`⚠️ Assessment ${assessmentId} not found in database`);
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }
    const assessment = assessRows[0];

    // Fetch question blocks to determine types, counts, durations, and marks
    const { rows: blockRows } = await db.query(
      `SELECT question_type, question_count, duration_per_question, num_options, num_first_side, num_second_side, positive_marks, negative_marks
       FROM question_blocks WHERE assessment_id = $1`,
      [assessmentId]
    );
    if (blockRows.length === 0) {
      console.warn(`⚠️ No question blocks defined for assessment ${assessmentId}. Using defaults.`);
      blockRows.push({ question_type: "multiple_choice", question_count: 5, duration_per_question: 120, positive_marks: 1, negative_marks: 0 });
    }

    const questionTypes = [...new Set(blockRows.map(b => b.question_type))];
    const numQuestions = blockRows.reduce((sum, b) => sum + b.question_count, 0);
    const typeCountsStr = blockRows.map(b => `${b.question_count} ${b.question_type}`).join(", ");
    const totalDuration = blockRows.reduce((sum, b) => sum + b.question_count * (b.duration_per_question || 120), 0);

    console.log(`📊 Using instructor-defined questions: ${typeCountsStr} (total ${numQuestions}, duration ${totalDuration} seconds)`);

    // Set is_executed to true if not already
    if (!assessment.is_executed) {
      console.log(`🔄 Updating is_executed to true for assessment ${assessmentId}`);
      await db.query(
        `UPDATE assessments SET is_executed = true, updated_at = NOW() WHERE id = $1`,
        [assessmentId]
      );
    } else {
      console.log(`ℹ️ Assessment ${assessmentId} already has is_executed = true`);
    }

    // Validate enrollment
    const { rows: enrollRows } = await db.query(
      `SELECT 1 FROM enrollments WHERE student_id = $1 AND assessment_id = $2`,
      [studentId, assessmentId]
    );
    if (enrollRows.length === 0) {
      console.warn(`⚠️ Student ${studentId} not enrolled for assessment ${assessmentId}`);
      return res.status(403).json({ success: false, message: "You are not enrolled for this assessment" });
    }

    // Check for existing in-progress attempt
    const { rows: existingAttempt } = await db.query(
      `SELECT id FROM assessment_attempts WHERE student_id = $1 AND assessment_id = $2 AND status = 'in_progress'`,
      [studentId, assessmentId]
    );
    if (existingAttempt.length > 0) {
      console.warn(`⚠️ In-progress attempt exists for student ${studentId}, assessment ${assessmentId}`);
      return res.status(400).json({ success: false, message: "Assessment already in progress" });
    }

    // Create attempt
    const { rows: attemptRows } = await db.query(
      `INSERT INTO assessment_attempts (student_id, assessment_id, attempt_number, started_at, language, status)
       VALUES ($1, $2, 1, NOW(), $3, 'in_progress') RETURNING id`,
      [studentId, assessmentId, language]
    );
    const attemptId = attemptRows[0].id;
    console.log(`✅ Created attempt ${attemptId} for assessment ${assessmentId}`);

    // Generate questions using the assessmentModel
    await generateAssessmentQuestions(assessmentId, attemptId, language, assessment);

    // Fetch generated questions (options is already JSONB, no need for JSON.parse)
    const { rows: questionRows } = await db.query(
      `SELECT id, question_type, question_text, options, correct_answer, marks, duration_per_question, positive_marks, negative_marks
       FROM generated_questions WHERE attempt_id = $1 ORDER BY question_order`,
      [attemptId]
    );

    res.status(200).json({
      success: true,
      message: "Assessment started successfully",
      data: {
        attemptId,
        duration: totalDuration,
        questions: questionRows,
      },
    });
  } catch (error) {
    console.error("❌ startAssessmentForStudent error:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to start assessment" });
  }
};

export const submitAssessmentForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { assessmentId } = req.params;
    const { attemptId, answers, language } = req.body;

    console.log(`📝 Submitting assessment ${assessmentId} for student ${studentId}, attempt ${attemptId}`);

    // Validate attempt
    const { rows: attemptRows } = await db.query(
      `SELECT id, assessment_id, student_id, status
       FROM assessment_attempts WHERE id = $1 AND student_id = $2 AND assessment_id = $3 AND status = 'in_progress'`,
      [attemptId, studentId, assessmentId]
    );
    if (attemptRows.length === 0) {
      console.warn(`⚠️ Attempt ${attemptId} not found or not in progress for student ${studentId}, assessment ${assessmentId}`);
      return res.status(400).json({ success: false, message: "Invalid attempt or assessment not in progress" });
    }

    // Fetch question blocks for marks
    const { rows: blockRows } = await db.query(
      `SELECT question_type, positive_marks, negative_marks
       FROM question_blocks WHERE assessment_id = $1`,
      [assessmentId]
    );

    // Fetch questions with correct answers and marks
    const { rows: questionRows } = await db.query(
      `SELECT id, question_type, correct_answer, positive_marks, negative_marks
       FROM generated_questions WHERE attempt_id = $1`,
      [attemptId]
    );

    let totalScore = 0;
    const evaluatedAnswers = await Promise.all(
      answers.map(async (ans) => {
        const q = questionRows.find((q) => q.id === ans.questionId);
        if (!q) {
          console.warn(`⚠️ Question ${ans.questionId} not found for attempt ${attemptId}`);
          return { questionId: ans.questionId, answer: ans.answer, score: 0, correct: false };
        }

        let isCorrect;
        if (q.question_type === "short_answer") {
          const checkingModel = await getCheckingModel();
          const langName = mapLanguageCode(language);
          const prompt = `In ${langName}, evaluate if the student's answer "${ans.answer}" matches the correct answer "${q.correct_answer}" for a short-answer question. Return "true" if they are equivalent (ignoring case and minor phrasing differences), "false" otherwise.`;
          const response = await generateContent(checkingModel, prompt);
          isCorrect = response.trim().toLowerCase() === "true";
        } else {
          isCorrect = checkAnswer(q.question_type, ans.answer, q.correct_answer);
        }

        const score = isCorrect ? parseFloat(q.positive_marks || 1) : -parseFloat(q.negative_marks || 0);
        totalScore += score;

        // Store answer
        await db.query(
          `INSERT INTO student_answers (attempt_id, question_id, student_answer)
           VALUES ($1, $2, $3)`,
          [attemptId, ans.questionId, JSON.stringify(ans.answer)]
        );

        return {
          questionId: ans.questionId,
          answer: ans.answer,
          correctAnswer: q.correct_answer,
          score,
          correct: isCorrect,
        };
      })
    );

    // Update attempt status and score
    await db.query(
      `UPDATE assessment_attempts SET status = 'completed', completed_at = NOW(), score = $1
       WHERE id = $2`,
      [totalScore, attemptId]
    );

    console.log(`✅ Assessment ${assessmentId} submitted, attempt ${attemptId}, score: ${totalScore}`);

    res.status(200).json({
      success: true,
      message: "Assessment submitted successfully",
      data: { attemptId, score: totalScore, answers: evaluatedAnswers },
    });
  } catch (error) {
    console.error("❌ submitAssessmentForStudent error:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to submit assessment" });
  }
};

export const getSubmissionDetailsForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { submissionId } = req.params;

    console.log(`📋 Fetching submission ${submissionId} for student ${studentId}`);

    const { rows: attemptRows } = await db.query(
      `SELECT aa.*, a.title AS assessment_title
       FROM assessment_attempts aa
       JOIN assessments a ON aa.assessment_id = a.id
       WHERE aa.id = $1 AND aa.student_id = $2`,
      [submissionId, studentId]
    );
    if (attemptRows.length === 0) {
      console.warn(`⚠️ Submission ${submissionId} not found for student ${studentId}`);
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    const { rows: answerRows } = await db.query(
      `SELECT sa.*, gq.question_text, gq.question_type, gq.correct_answer, gq.positive_marks, gq.negative_marks
       FROM student_answers sa
       JOIN generated_questions gq ON sa.question_id = gq.id
       WHERE sa.attempt_id = $1`,
      [submissionId]
    );

    res.status(200).json({
      success: true,
      message: "Submission details retrieved successfully",
      data: {
        attempt: attemptRows[0],
        answers: answerRows,
      },
    });
  } catch (error) {
    console.error("❌ getSubmissionDetailsForStudent error:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to retrieve submission details" });
  }
};

export const getAssessmentForInstructorPrint = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`📋 Fetching assessment ${assessmentId} for printing by user ${userId} (${userRole})`);

    const { rows: assessmentRows } = await db.query(
      `SELECT a.*, 
              (SELECT json_agg(
                 json_build_object(
                   'question_type', qb.question_type,
                   'question_count', qb.question_count,
                   'duration_per_question', qb.duration_per_question,
                   'num_options', qb.num_options,
                   'num_first_side', qb.num_first_side,
                   'num_second_side', qb.num_second_side,
                   'positive_marks', qb.positive_marks,
                   'negative_marks', qb.negative_marks
                 )
              ) FROM question_blocks qb WHERE qb.assessment_id = a.id) as question_blocks
       FROM assessments a
       WHERE a.id = $1 AND a.instructor_id = $2`,
      [assessmentId, userId]
    );
    if (assessmentRows.length === 0) {
      console.warn(`⚠️ Assessment ${assessmentId} not found for instructor ${userId}`);
      return res.status(404).json({ success: false, message: "Assessment not found or access denied" });
    }

    res.status(200).json({
      success: true,
      message: "Assessment retrieved for printing",
      data: assessmentRows[0],
    });
  } catch (error) {
    console.error("❌ getAssessmentForInstructorPrint error:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to retrieve assessment for printing" });
  }
};