import db from "../DB/db.js";
import { getCreationModel, getCheckingModel, mapLanguageCode } from "../services/geminiService.js";

export const startAssessmentForStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { assessmentId } = req.params;
    const { language = "en", numQuestions = 5, questionTypes = ["multiple_choice"] } = req.body || {}; // Instructor-defined

    console.log(`📝 Starting assessment ${assessmentId} for student ${studentId} in language ${language}, with ${numQuestions} questions of types ${questionTypes.join(", ")}`);

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

    // Generate questions via Gemini creation key with lighter flash model
    const model = getCreationModel("gemini-1.5-flash");
    const langName = mapLanguageCode(language);
    let questions = [];
    let attempts = 0;
    const maxAttempts = 3;
    let questionPrompt = `Generate a complete and valid JSON array of unique assessment questions in ${langName} based on the assessment title "${assessment.title}" and prompt "${assessment.prompt}". Follow these rules strictly:
    1. Start with: [
    2. Each question must have: id, question_type, question_text, options (array of 4 for multiple_choice or null for true_false), correct_answer, marks.
    3. Use only the following question types: ${questionTypes.join(", ")}.
    4. Include exactly ${numQuestions} unique questions, ensuring no repetition within this set.
    5. End with: ]
    6. No extra text, comments, or incomplete objects. Ensure all fields (id, question_type, question_text, options, correct_answer, marks) are present and valid for each question.
    External links for context: ${(assessment.external_links || []).join(", ")}`;

    while (attempts < maxAttempts && (!Array.isArray(questions) || questions.length !== numQuestions)) {
      try {
        const gen = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: questionPrompt }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
        });
        const text = (await gen.response).text();
        console.log(`📝 Raw Gemini response (Attempt ${attempts + 1}):`, text); // Log full response for debugging
        const jsonMatch = text.match(/\[[\s\S]*\]/); // Changed to greedy match to capture full array
        if (jsonMatch) {
          try {
            questions = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(questions)) {
              throw new Error("Parsed result is not an array");
            }
            if (questions.length > numQuestions) {
              questions = questions.slice(0, numQuestions); // Truncate if more than requested
            }
            // Validate question types and required fields
            const invalidTypes = questions.filter(q => !questionTypes.includes(q.question_type));
            if (invalidTypes.length > 0) {
              throw new Error(`Invalid question types detected: ${invalidTypes.map(q => q.question_type).join(", ")}`);
            }
            const missingFields = questions.filter(q => !q.id || !q.question_text || !q.correct_answer || !q.marks || (q.question_type === "multiple_choice" && (!q.options || q.options.length !== 4)));
            if (missingFields.length > 0) {
              throw new Error("Missing required fields in some questions");
            }
            // Check for uniqueness by question_text
            const uniqueQuestions = new Set(questions.map(q => q.question_text));
            if (uniqueQuestions.size !== questions.length) {
              throw new Error("Duplicate questions detected");
            }
          } catch (e) {
            console.error(`❌ Invalid JSON from Gemini (Attempt ${attempts + 1}):`, e.message, "Raw text:", jsonMatch[0]);
            questions = []; // Reset for next attempt
          }
        } else {
          console.warn(`⚠️ No valid JSON array found in response (Attempt ${attempts + 1})`);
          questions = [];
        }
      } catch (e) {
        console.error(`❌ Failed to generate questions from Gemini (Attempt ${attempts + 1}):`, e.message);
        questions = [];
      }
      attempts++;
      if (attempts < maxAttempts && (!Array.isArray(questions) || questions.length < numQuestions)) {
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1-minute delay to avoid rate limit
        console.warn(`⚠️ Retrying question generation (Attempt ${attempts + 1}/${maxAttempts}) with adjusted prompt`);
        questionPrompt += `\nEnsure all ${numQuestions} questions are unique, complete, and fully formatted with all fields (id, question_type, question_text, options, correct_answer, marks). Avoid repetition and ensure strict JSON compliance.`;
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error(`❌ Failed to generate any valid questions after ${maxAttempts} attempts`);
      return res.status(500).json({ success: false, message: "Failed to generate valid questions. Please try again or contact support." });
    }

    // If fewer questions than requested, proceed with what we have
    if (questions.length < numQuestions) {
      console.warn(`⚠️ Generated only ${questions.length} questions instead of ${numQuestions}. Proceeding with available questions.`);
    }

    // Predict duration based on instructor's configuration
    let duration = Math.ceil(questions.length * 3 / 5) * 5; // Adjusted to actual number of questions
    try {
      const durationPrompt = `Estimate the duration (in minutes) for an assessment with ${questions.length} questions of types ${questionTypes.join(", ")}. Guidelines: 2-3 minutes per multiple_choice, 1-2 minutes per true_false, return a single number rounded up to the nearest 5.`;
      const durationGen = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: durationPrompt }] }],
        generationConfig: { maxOutputTokens: 50, temperature: 0.3 },
      });
      const durationText = (await durationGen.response).text().trim();
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
      `SELECT id, question_order, question_type, question_text, options, correct_answer, marks
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

    // Validate attempt
    const { rows: attemptRows } = await db.query(
      `SELECT * FROM assessment_attempts WHERE id = $1 AND student_id = $2 AND assessment_id = $3 AND status = 'in_progress'`,
      [attemptId, studentId, assessmentId]
    );
    if (attemptRows.length === 0) {
      console.warn(`⚠️ Invalid or completed attempt ${attemptId} for student ${studentId}, assessment ${assessmentId}`);
      return res.status(400).json({ success: false, message: "Invalid or completed attempt" });
    }

    // Fetch questions
    const { rows: questionRows } = await db.query(
      `SELECT id, question_type, question_text, correct_answer, marks
       FROM generated_questions WHERE attempt_id = $1`,
      [attemptId]
    );

    if (questionRows.length === 0) {
      console.warn(`⚠️ No questions found for attempt ${attemptId}`);
      return res.status(400).json({ success: false, message: "No questions found for this attempt" });
    }

    // Validate all answers are provided
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

    // Evaluate answers using Gemini with batched prompt to reduce API calls
    const model = getCheckingModel();
    let totalScore = 0;
    const evaluatedAnswers = [];

    // Batch all evaluations into one prompt
    const evaluationPrompt = `Evaluate the following answers for correctness:\n${validAnswers.map((answer, index) => {
      const question = questionMap.get(answer.questionId);
      return `Question ${index + 1}:\nQuestion: ${question.question_text}\nQuestion Type: ${question.question_type}\nCorrect Answer: ${question.correct_answer}\nStudent Answer: ${answer.answer}\nLanguage: ${mapLanguageCode(language)}\nMarks: ${question.marks}`;
    }).join("\n")}\nProvide a JSON array where each object has: { questionId: number, isCorrect: boolean, feedback: string, score: number }`;
    let evaluations = [];
    try {
      const gen = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.3 },
      });
      const text = (await gen.response).text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        evaluations = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(evaluations) || evaluations.length !== validAnswers.length) {
          throw new Error("Invalid evaluation format");
        }
        evaluations.forEach(evaluation => {
          evaluation.score = Math.floor(evaluation.score); // Ensure integer score
        });
      }
    } catch (e) {
      console.error(`❌ Failed to evaluate answers from Gemini:`, e.message);
      evaluations = validAnswers.map((answer, index) => {
        const question = questionMap.get(answer.questionId);
        const isCorrect = (question.question_type === "multiple_choice" || question.question_type === "true_false") && answer.answer === question.correct_answer;
        return {
          questionId: answer.questionId,
          isCorrect,
          feedback: isCorrect ? "Correct answer" : `Incorrect. Correct answer: ${question.correct_answer}`,
          score: isCorrect ? Math.floor(question.marks) : 0,
        };
      });
    }

    // Process evaluations
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

    // Store answers and update attempt
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