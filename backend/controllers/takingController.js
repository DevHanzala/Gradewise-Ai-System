import db from "../DB/db.js";
import { getCreationModel, getCheckingModel, mapLanguageCode, generateContent } from "../services/geminiService.js";

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

    // Fetch question blocks to determine types and counts
    const { rows: blockRows } = await db.query(
      `SELECT question_type, question_count FROM question_blocks WHERE assessment_id = $1`,
      [assessmentId]
    );
    if (blockRows.length === 0) {
      console.warn(`⚠️ No question blocks defined for assessment ${assessmentId}. Using defaults.`);
      blockRows = [{ question_type: "multiple_choice", question_count: 5 }];
    }

    const questionTypes = [...new Set(blockRows.map(b => b.question_type))];
    const numQuestions = blockRows.reduce((sum, b) => sum + b.question_count, 0);
    const typeCountsStr = blockRows.map(b => `${b.question_count} ${b.question_type}`).join(", ");

    console.log(`📊 Using instructor-defined questions: ${typeCountsStr} (total ${numQuestions})`);

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

    // Generate questions via Gemini
    const client = await getCreationModel();
    const langName = mapLanguageCode(language);
    let questions = [];
    let questionPrompt = `Generate a complete and valid JSON array of unique assessment questions in ${langName} based on the assessment title "${assessment.title}" and prompt "${assessment.prompt}". Follow these rules strictly:
    1. Start with: [
    2. Each question must have: id, question_type, question_text, options (array of 4 for multiple_choice, array of pairs for matching, null for true_false or short_answer), correct_answer (string for multiple_choice/short_answer, boolean for true_false, array of pairs for matching), marks.
    3. Use only the following question types: ${questionTypes.join(", ")}.
    4. Include exactly these counts: ${typeCountsStr}. Total questions: ${numQuestions}. Ensure no repetition within this set.
    5. End with: ]
    6. No extra text, comments, or incomplete objects. Ensure all fields (id, question_type, question_text, options, correct_answer, marks) are present and valid for each question.
    External links for context: ${(assessment.external_links || []).join(", ")}`;

    try {
      const text = await generateContent(client, questionPrompt, { maxOutputTokens: 4000, temperature: 0.7 });
      console.log(`📝 Raw Gemini response:`, text);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          questions = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(questions)) {
            throw new Error("Parsed result is not an array");
          }
          if (questions.length > numQuestions) {
            questions = questions.slice(0, numQuestions);
          }
          const invalidTypes = questions.filter(q => !questionTypes.includes(q.question_type));
          if (invalidTypes.length > 0) {
            throw new Error(`Invalid question types detected: ${invalidTypes.map(q => q.question_type).join(", ")}`);
          }
          const missingFields = questions.filter(q =>
            q.id === undefined ||
            q.question_text === undefined ||
            q.correct_answer === undefined ||
            q.marks === undefined ||
            (q.question_type === "multiple_choice" && (!q.options || q.options.length !== 4)) ||
            (q.question_type === "matching" && (!q.options || !Array.isArray(q.options) || q.options.length !== 4 || !q.correct_answer || !Array.isArray(q.correct_answer) || q.correct_answer.length !== 4))
          );
          if (missingFields.length > 0) {
            throw new Error("Missing required fields in some questions");
          }
          const uniqueQuestions = new Set(questions.map(q => q.question_text));
          if (uniqueQuestions.size !== questions.length) {
            throw new Error("Duplicate questions detected");
          }
          const generatedCounts = questions.reduce((acc, q) => {
            acc[q.question_type] = (acc[q.question_type] || 0) + 1;
            return acc;
          }, {});
          const expectedCounts = blockRows.reduce((acc, b) => {
            acc[b.question_type] = b.question_count;
            return acc;
          }, {});
          const countsMatch = questionTypes.every(type => generatedCounts[type] === expectedCounts[type]);
          if (!countsMatch) {
            throw new Error("Generated question counts per type do not match instructor settings");
          }
        } catch (e) {
          console.error(`❌ Invalid JSON from Gemini:`, e.message, "Raw text:", jsonMatch[0]);
          questions = [];
        }
      } else {
        console.warn(`⚠️ No valid JSON array found in response`);
        questions = [];
      }
    } catch (e) {
      console.error(`❌ Failed to generate questions from Gemini:`, e.message);
      questions = [];
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error(`❌ Failed to generate valid questions`);
      return res.status(500).json({ success: false, message: "Failed to generate valid questions. Please try again or contact support." });
    }

    if (questions.length < numQuestions) {
      console.warn(`⚠️ Generated only ${questions.length} questions instead of ${numQuestions}. Proceeding with available questions.`);
    }

    let duration = Math.ceil(questions.length * 3 / 5) * 5;
    try {
      const durationPrompt = `Estimate the duration (in minutes) for an assessment with ${questions.length} questions of types ${questionTypes.join(", ")}. Guidelines: 2-3 minutes per multiple_choice, 1-2 minutes per true_false, 3-4 minutes per matching, 2-3 minutes per short_answer, return a single number rounded up to the nearest 5.`;
      const durationText = await generateContent(client, durationPrompt, { maxOutputTokens: 50, temperature: 0.3 });
      const parsedDuration = parseInt(durationText.match(/\d+/)?.[0], 10);
      if (!isNaN(parsedDuration) && parsedDuration > 0) {
        duration = Math.ceil(parsedDuration / 5) * 5;
        console.log(`✅ AI-predicted duration: ${duration} minutes for ${questions.length} questions`);
      } else {
        console.warn(`⚠️ Invalid duration from Gemini: ${durationText}, using calculated fallback`);
      }
    } catch (e) {
      console.error("❌ Failed to predict duration from Gemini:", e.message);
    }

    // Store generated questions with explicit JSON casting
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = Array.isArray(q.options) ? JSON.stringify(q.options) : null;
      console.log(`📋 Inserting question ${i + 1}:`, { question_text: q.question_text, options, correct_answer: q.correct_answer });
      await db.query(
        `INSERT INTO generated_questions (attempt_id, question_order, question_type, question_text, options, correct_answer, marks)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
        [attemptId, i + 1, q.question_type, q.question_text, options, q.correct_answer, q.marks]
      );
    }

    const { rows: dbQuestions } = await db.query(
      `SELECT id, question_order, question_type, question_text, options::text, correct_answer, marks
       FROM generated_questions WHERE attempt_id = $1 ORDER BY question_order ASC`,
      [attemptId]
    );

    console.log(`✅ Generated ${dbQuestions.length} questions for attempt ${attemptId}`);

    res.status(200).json({
      success: true,
      message: "Assessment started successfully",
      data: { attemptId, duration, questions: dbQuestions },
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
    const { answers, attemptId, language = "en" } = req.body;

    console.log(`📝 Submitting assessment ${assessmentId} for student ${studentId}, attempt ${attemptId}`);

    const { rows: attemptRows } = await db.query(
      `SELECT * FROM assessment_attempts WHERE id = $1 AND student_id = $2 AND assessment_id = $3 AND status = 'in_progress'`,
      [attemptId, studentId, assessmentId]
    );
    if (attemptRows.length === 0) {
      console.warn(`⚠️ Invalid or completed attempt ${attemptId} for student ${studentId}, assessment ${assessmentId}`);
      return res.status(400).json({ success: false, message: "Invalid or completed attempt" });
    }

    const { rows: questionRows } = await db.query(
      `SELECT id, question_type, question_text, correct_answer, marks
       FROM generated_questions WHERE attempt_id = $1`,
      [attemptId]
    );

    if (questionRows.length === 0) {
      console.warn(`⚠️ No questions found for attempt ${attemptId}`);
      return res.status(400).json({ success: false, message: "No questions found for this attempt" });
    }

    if (!Array.isArray(answers) || answers.length !== questionRows.length) {
      console.warn(`⚠️ Incomplete answers provided for attempt ${attemptId}, expected ${questionRows.length}, got ${answers.length}`);
      return res.status(400).json({ success: false, message: `Please answer all ${questionRows.length} questions` });
    }

    const questionMap = new Map(questionRows.map(q => [q.id, q]));
    const validAnswers = answers.filter(a => questionMap.has(a.questionId) && a.answer !== undefined);
    if (validAnswers.length !== questionRows.length) {
      console.warn(`⚠️ Not all questions answered for attempt ${attemptId}`);
      return res.status(400).json({ success: false, message: `Please answer all ${questionRows.length} questions` });
    }

    const client = await getCheckingModel();
    let totalScore = 0;
    const evaluatedAnswers = [];

    const evaluationPrompt = `Evaluate the following answers for correctness:\n${validAnswers.map((answer, index) => {
      const question = questionMap.get(answer.questionId);
      return `Question ${index + 1}:\nQuestion: ${question.question_text}\nQuestion Type: ${question.question_type}\nCorrect Answer: ${JSON.stringify(question.correct_answer)}\nStudent Answer: ${JSON.stringify(answer.answer)}\nLanguage: ${mapLanguageCode(language)}\nMarks: ${question.marks}`;
    }).join("\n")}\nProvide a JSON array where each object has: { questionId: number, isCorrect: boolean, feedback: string, score: number }`;
    let evaluations = [];
    try {
      const text = await generateContent(client, evaluationPrompt, { maxOutputTokens: 2000, temperature: 0.3 });
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        evaluations = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(evaluations) || evaluations.length !== validAnswers.length) {
          throw new Error("Invalid evaluation format");
        }
        evaluations.forEach(evaluation => {
          evaluation.score = Math.floor(evaluation.score || 0);
        });
      }
    } catch (e) {
      console.error(`❌ Failed to evaluate answers from Gemini:`, e.message);
      evaluations = validAnswers.map((answer, index) => {
        const question = questionMap.get(answer.questionId);
        let isCorrect = false;
        if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
          isCorrect = answer.answer === question.correct_answer;
        } else if (question.question_type === "matching") {
          isCorrect = JSON.stringify(answer.answer) === JSON.stringify(question.correct_answer);
        } else if (question.question_type === "short_answer") {
          isCorrect = answer.answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
        }
        return {
          questionId: answer.questionId,
          isCorrect,
          feedback: isCorrect ? "Correct answer" : `Incorrect. Correct answer: ${JSON.stringify(question.correct_answer)}`,
          score: isCorrect ? Math.floor(question.marks) : 0,
        };
      });
    }

    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];
      const answer = validAnswers[i];
      totalScore += evaluation.score;
      evaluatedAnswers.push({
        questionId: answer.questionId,
        student_answer: answer.answer,
        isCorrect: evaluation.isCorrect,
        feedback: evaluation.feedback,
        score: evaluation.score,
      });
    }

    for (const answer of evaluatedAnswers) {
      await db.query(
        `INSERT INTO student_answers (attempt_id, question_id, student_answer, is_correct, feedback, score, answered_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [attemptId, answer.questionId, answer.student_answer, answer.isCorrect, answer.feedback, answer.score]
      );
    }

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
      `SELECT sa.*, gq.question_text, gq.question_type, gq.correct_answer, gq.marks
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
                   'question_count', qb.question_count
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