import db from "../DB/db.js";
import { findResourceById } from "./resourceModel.js";
import { getCreationModel, mapLanguageCode, generateContent } from "../services/geminiService.js";

const ensureAssessmentsTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessments'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessments table...");
      await db.query(`
        CREATE TABLE assessments (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255),
          prompt TEXT NOT NULL,
          external_links JSONB DEFAULT '[]',
          instructor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          is_published BOOLEAN DEFAULT FALSE,
          is_executed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX idx_assessments_instructor_id ON assessments(instructor_id);
      `);
      console.log("✅ assessments table created");
    } else {
      await db.query(`
        ALTER TABLE assessments
        ALTER COLUMN prompt SET NOT NULL,
        ALTER COLUMN title DROP NOT NULL;
      `);
      console.log("✅ assessments table updated (prompt made required, title made optional)");
    }
  } catch (error) {
    console.error("❌ Error creating/updating assessments table:", error);
    throw error;
  }
};

const ensureQuestionBlocksTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'question_blocks'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating question_blocks table...");
      await db.query(`
        CREATE TABLE question_blocks (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'true_false')),
          question_count INTEGER NOT NULL,
          duration_per_question INTEGER NOT NULL DEFAULT 120,
          num_options INTEGER,
          positive_marks NUMERIC DEFAULT 1,
          negative_marks NUMERIC DEFAULT 0,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX idx_question_blocks_assessment_id ON question_blocks(assessment_id);
      `);
      console.log("✅ question_blocks table created");
    } else {
      console.log("Checking for missing columns or type updates in question_blocks table...");
      await db.query(`
        DO $$ 
        BEGIN
          ALTER TABLE question_blocks
            ADD COLUMN IF NOT EXISTS duration_per_question INTEGER NOT NULL DEFAULT 120,
            ADD COLUMN IF NOT EXISTS num_options INTEGER,
            ADD COLUMN IF NOT EXISTS positive_marks NUMERIC DEFAULT 1,
            ADD COLUMN IF NOT EXISTS negative_marks NUMERIC DEFAULT 0;
          ALTER TABLE question_blocks
            ALTER COLUMN positive_marks TYPE NUMERIC USING (COALESCE(positive_marks, 1)::NUMERIC),
            ALTER COLUMN negative_marks TYPE NUMERIC USING (COALESCE(negative_marks, 0)::NUMERIC);
        EXCEPTION
          WHEN duplicate_column THEN
            RAISE NOTICE 'Columns already exist';
          WHEN invalid_column_reference THEN
            RAISE NOTICE 'Column type update skipped due to invalid reference';
        END;
        $$;
      `);
      console.log("✅ question_blocks table updated with new columns and types");
    }
  } catch (error) {
    console.error("❌ Error creating/updating question_blocks table:", error);
    throw error;
  }
};

const ensureAssessmentResourcesTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_resources'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessment_resources table...");
      await db.query(`
        CREATE TABLE assessment_resources (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX idx_assessment_resources_assessment_id ON assessment_resources(assessment_id);
        CREATE INDEX idx_assessment_resources_resource_id ON assessment_resources(resource_id);
      `);
      console.log("✅ assessment_resources table created");
    }
  } catch (error) {
    console.error("❌ Error creating assessment_resources table:", error);
    throw error;
  }
};

const ensureEnrollmentsTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enrollments'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating enrollments table...");
      await db.query(`
        CREATE TABLE enrollments (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(assessment_id, student_id)
        )
      `);
      await db.query(`
        CREATE INDEX idx_enrollments_assessment_id ON enrollments(assessment_id);
        CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
      `);
      console.log("✅ enrollments table created");
    }
  } catch (error) {
    console.error("❌ Error creating enrollments table:", error);
    throw error;
  }
};

const ensureResourceChunksTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'resource_chunks'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating resource_chunks table...");
      await db.query(`
        CREATE TABLE resource_chunks (
          id SERIAL PRIMARY KEY,
          resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
          chunk_text TEXT NOT NULL,
          embedding VECTOR(384),
          chunk_index INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX idx_resource_chunks_resource_id ON resource_chunks(resource_id);
      `);
      console.log("✅ resource_chunks table created");
    }
  } catch (error) {
    console.error("❌ Error creating resource_chunks table:", error);
    throw error;
  }
};

const ensureGeneratedQuestionsTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'generated_questions'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating generated_questions table...");
      await db.query(`
        CREATE TABLE generated_questions (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER REFERENCES assessment_attempts(id) ON DELETE CASCADE,
          question_order INTEGER NOT NULL,
          question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'true_false')),
          question_text TEXT NOT NULL,
          options JSONB,
          correct_answer TEXT,
          positive_marks NUMERIC DEFAULT 1,
          negative_marks NUMERIC DEFAULT 0,
          duration_per_question INTEGER NOT NULL DEFAULT 180,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX idx_generated_questions_attempt_id ON generated_questions(attempt_id);
      `);
      console.log("✅ generated_questions table created");
    } else {
      console.log("Checking for missing columns or type updates in generated_questions table...");
      await db.query(`
        DO $$ 
        BEGIN
          ALTER TABLE generated_questions
            ADD COLUMN IF NOT EXISTS positive_marks NUMERIC DEFAULT 1,
            ADD COLUMN IF NOT EXISTS negative_marks NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS duration_per_question INTEGER NOT NULL DEFAULT 180;
          ALTER TABLE generated_questions
            ALTER COLUMN positive_marks TYPE NUMERIC USING (COALESCE(positive_marks, 1)::NUMERIC),
            ALTER COLUMN negative_marks TYPE NUMERIC USING (COALESCE(negative_marks, 0)::NUMERIC);
        EXCEPTION
          WHEN duplicate_column THEN
            RAISE NOTICE 'Columns already exist';
          WHEN invalid_column_reference THEN
            RAISE NOTICE 'Column type update skipped due to invalid reference';
        END;
        $$;
      `);
      console.log("✅ generated_questions table updated with new columns and types");
    }
  } catch (error) {
    console.error("❌ Error creating/updating generated_questions table:", error);
    throw error;
  }
};

const ensureAssessmentAttemptsTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_attempts'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessment_attempts table...");
      await db.query(`
        CREATE TABLE assessment_attempts (
          id SERIAL PRIMARY KEY,
          student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          language VARCHAR(10),
          status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
          completed_at TIMESTAMP WITH TIME ZONE,
          score NUMERIC DEFAULT 0
        )
      `);
      await db.query(`
        CREATE INDEX idx_assessment_attempts_student_id ON assessment_attempts(student_id);
        CREATE INDEX idx_assessment_attempts_assessment_id ON assessment_attempts(assessment_id);
      `);
      console.log("✅ assessment_attempts table created");
    } else {
      console.log("Checking for score column type update in assessment_attempts table...");
      await db.query(`
        DO $$ 
        BEGIN
          ALTER TABLE assessment_attempts
            ALTER COLUMN score TYPE NUMERIC USING (COALESCE(score, 0)::NUMERIC),
            ALTER COLUMN score SET DEFAULT 0;
        EXCEPTION
          WHEN invalid_column_reference THEN
            RAISE NOTICE 'Column type update skipped due to invalid reference';
        END;
        $$;
      `);
      console.log("✅ assessment_attempts table updated with score as NUMERIC");
    }
  } catch (error) {
    console.error("❌ Error creating/updating assessment_attempts table:", error);
    throw error;
  }
};

const ensureStudentAnswersTable = async () => {
  try {
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_answers'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating student_answers table...");
      await db.query(`
        CREATE TABLE student_answers (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER REFERENCES assessment_attempts(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES generated_questions(id) ON DELETE CASCADE,
          student_answer TEXT,
          score NUMERIC DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX idx_student_answers_attempt_id ON student_answers(attempt_id);
        CREATE INDEX idx_student_answers_question_id ON student_answers(question_id);
      `);
      console.log("✅ student_answers table created");
    } else {
      await db.query(`
        DO $$ 
        BEGIN
          ALTER TABLE student_answers
            ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;
          ALTER TABLE student_answers
            ALTER COLUMN score TYPE NUMERIC USING (COALESCE(score, 0)::NUMERIC);
        EXCEPTION
          WHEN duplicate_column THEN
            RAISE NOTICE 'Column already exists';
          WHEN invalid_column_reference THEN
            RAISE NOTICE 'Column type update skipped due to invalid reference';
        END;
        $$;
      `);
      console.log("✅ student_answers table updated with score column");
    }
  } catch (error) {
    console.error("❌ Error creating/updating student_answers table:", error);
    throw error;
  }
};

const createAssessment = async (assessmentData) => {
  const { title, prompt, external_links, instructor_id, is_executed = false } = assessmentData;
  const query = `
    INSERT INTO assessments (title, prompt, external_links, instructor_id, is_executed)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const validExternalLinks = Array.isArray(external_links) ? external_links.filter(link => link && typeof link === "string" && link.trim() !== "") : [];
  try {
    const { rows } = await db.query(query, [title || null, prompt, JSON.stringify(validExternalLinks), instructor_id, is_executed]);
    console.log(`✅ Created assessment: ID=${rows[0].id}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error creating assessment:", error);
    throw error;
  }
};

const storeQuestionBlocks = async (assessmentId, questionBlocks, instructorId) => {
  try {
    await db.query("DELETE FROM question_blocks WHERE assessment_id = $1", [assessmentId]);
    for (const block of questionBlocks) {
      const { question_type, question_count, duration_per_question, num_options, positive_marks, negative_marks } = block;
      await db.query(
        `
        INSERT INTO question_blocks (
          assessment_id, 
          question_type, 
          question_count, 
          duration_per_question, 
          num_options, 
          positive_marks, 
          negative_marks, 
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          assessmentId,
          question_type,
          question_count,
          duration_per_question || 120,
          num_options || null,
          positive_marks !== undefined ? Number(positive_marks) : 1,
          negative_marks !== undefined ? Number(negative_marks) : 0,
          instructorId,
        ]
      );
    }
    console.log(`✅ Stored ${questionBlocks.length} question blocks for assessment ${assessmentId}`);
  } catch (error) {
    console.error("❌ Error storing question blocks:", error);
    throw error;
  }
};

const getAssessmentsByInstructor = async (instructorId) => {
  const query = `
    SELECT a.*, 
           COALESCE(
             (SELECT json_agg(
                json_build_object(
                  'id', qb.id,
                  'question_type', qb.question_type,
                  'question_count', qb.question_count,
                  'duration_per_question', COALESCE(qb.duration_per_question, 180),
                  'num_options', qb.num_options,
                  'positive_marks', qb.positive_marks,
                  'negative_marks', qb.negative_marks
                )
             ) FROM question_blocks qb WHERE qb.assessment_id = a.id),
             '[]'
           ) as question_blocks,
           COALESCE(
             (SELECT json_agg(
                json_build_object(
                  'id', r.id,
                  'name', r.name,
                  'type', r.file_type,
                  'content_type', r.content_type,
                  'url', r.url
                )
             ) FROM assessment_resources ar JOIN resources r ON ar.resource_id = r.id WHERE ar.assessment_id = a.id),
             '[]'
           ) as resources
    FROM assessments a
    WHERE a.instructor_id = $1
    ORDER BY a.created_at DESC
  `;
  try {
    const { rows } = await db.query(query, [instructorId]);
    return rows.map((row) => ({
      ...row,
      question_blocks: row.question_blocks || [],
      resources: row.resources || [],
      external_links: row.external_links || [],
    }));
  } catch (error) {
    console.error("❌ Error fetching assessments:", error);
    throw error;
  }
};

const getAssessmentById = async (assessment_id, user_id, user_role) => {
  try {
    if (!assessment_id || isNaN(parseInt(assessment_id))) {
      throw new Error("Invalid assessment ID");
    }
    const id = parseInt(assessment_id);
    let query;
    let values;
    if (user_role === "instructor" || user_role === "admin" || user_role === "super_admin") {
      query = `
        SELECT a.*, 
               COALESCE(
                 ARRAY_AGG(
                   json_build_object(
                     'question_type', qb.question_type,
                     'question_count', qb.question_count,
                     'duration_per_question', COALESCE(qb.duration_per_question, 180),
                     'num_options', qb.num_options,
                     'positive_marks', qb.positive_marks,
                     'negative_marks', qb.negative_marks
                   )
                 ) FILTER (WHERE qb.id IS NOT NULL),
                 '{}'
               ) AS question_blocks,
               COALESCE(
                 ARRAY_AGG(
                   json_build_object(
                     'id', r.id,
                     'name', r.name,
                     'file_path', r.file_path,
                     'file_type', r.file_type
                   )
                 ) FILTER (WHERE r.id IS NOT NULL),
                 '{}'
               ) AS resources
        FROM assessments a
        LEFT JOIN question_blocks qb ON a.id = qb.assessment_id
        LEFT JOIN assessment_resources ar ON a.id = ar.assessment_id
        LEFT JOIN resources r ON ar.resource_id = r.id
        WHERE a.id = $1 AND a.instructor_id = $2
        GROUP BY a.id
      `;
      values = [id, user_id];
    } else {
      query = `
        SELECT a.*, 
               COALESCE(
                 ARRAY_AGG(
                   json_build_object(
                     'question_type', qb.question_type,
                     'question_count', qb.question_count,
                     'duration_per_question', COALESCE(qb.duration_per_question, 180),
                     'num_options', qb.num_options,
                     'positive_marks', qb.positive_marks,
                     'negative_marks', qb.negative_marks
                   )
                 ) FILTER (WHERE qb.id IS NOT NULL),
                 '{}'
               ) AS question_blocks,
               COALESCE(
                 ARRAY_AGG(
                   json_build_object(
                     'id', r.id,
                     'name', r.name,
                     'file_path', r.file_path,
                     'file_type', r.file_type
                   )
                 ) FILTER (WHERE r.id IS NOT NULL),
                 '{}'
               ) AS resources
        FROM assessments a
        LEFT JOIN question_blocks qb ON a.id = qb.assessment_id
        LEFT JOIN assessment_resources ar ON a.id = ar.assessment_id
        LEFT JOIN resources r ON ar.resource_id = r.id
        LEFT JOIN enrollments e ON a.id = e.assessment_id
        WHERE a.id = $1 AND e.student_id = $2
        GROUP BY a.id
      `;
      values = [id, user_id];
    }
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return null;
    }
    return {
      ...result.rows[0],
      external_links: result.rows[0].external_links || [],
      question_blocks: result.rows[0].question_blocks || [],
      resources: result.rows[0].resources || [],
    };
  } catch (error) {
    console.error("❌ Error in getAssessmentById:", error);
    throw error;
  }
};

const updateAssessment = async (assessmentId, updateData) => {
  const { title, prompt, external_links } = updateData;
  const query = `
    UPDATE assessments
    SET title = $1, prompt = $2, external_links = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `;
  const validExternalLinks = Array.isArray(external_links) ? external_links.filter(link => link && typeof link === "string" && link.trim() !== "") : [];
  try {
    const { rows } = await db.query(query, [title || null, prompt, JSON.stringify(validExternalLinks), assessmentId]);
    if (rows.length === 0) throw new Error("Assessment not found");
    console.log(`✅ Assessment updated: ID=${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error updating assessment:", error);
    throw error;
  }
};

const deleteAssessment = async (assessmentId) => {
  try {
    const { rows } = await db.query("DELETE FROM assessments WHERE id = $1 RETURNING *", [assessmentId]);
    if (rows.length === 0) throw new Error("Assessment not found");
    console.log(`✅ Deleted assessment: ID=${assessmentId}`);
  } catch (error) {
    console.error("❌ Error deleting assessment:", error);
    throw error;
  }
};

const storeResourceChunk = async (resourceId, chunkText, embedding, metadata) => {
  try {
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      throw new Error("Invalid embedding: must be an array of 384 numbers");
    }
    const embeddingString = '[' + embedding.map(num => num.toString()).join(',') + ']';
    const query = `
      INSERT INTO resource_chunks (resource_id, chunk_text, embedding, chunk_index)
      VALUES ($1, $2, $3::vector, $4)
      RETURNING *
    `;
    const values = [resourceId, chunkText, embeddingString, metadata.chunk_index];
    const { rows } = await db.query(query, values);
    console.log(`✅ Stored chunk for resource ${resourceId}, index ${metadata.chunk_index}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error storing resource chunk:", error);
    throw error;
  }
};

const generateAssessmentQuestions = async (assessmentId, attemptId, language, assessment) => {
  const { rows: blockRows } = await db.query(
    `SELECT question_type, question_count, duration_per_question, num_options, positive_marks, negative_marks
     FROM question_blocks WHERE assessment_id = $1`,
    [assessmentId]
  );
  if (blockRows.length === 0) {
    throw new Error(`No question blocks defined for assessment ${assessmentId}`);
  }

  const questionTypes = [...new Set(blockRows.map(b => b.question_type))];
  const numQuestions = blockRows.reduce((sum, b) => sum + b.question_count, 0);
  const typeCountsStr = blockRows.map(b => `${b.question_count} ${b.question_type}`).join(", ");

  let questions = [];
  const client = await getCreationModel();
  const langName = mapLanguageCode(language);
  let questionPrompt = `Generate a complete and valid JSON array of unique assessment questions in ${langName} based on the assessment title "${assessment.title}"${assessment.prompt ? ` and prompt "${assessment.prompt}"` : ''}. Follow these rules strictly:
  1. Start with: [
  2. Each question must have: id, question_type, question_text, options (array of num_options for multiple_choice, null for true_false or short_answer), correct_answer (string for multiple_choice/short_answer, boolean for true_false), positive_marks, negative_marks, duration_per_question.
  3. Use only the following question types: ${questionTypes.join(", ")}.
  4. Include exactly these counts: ${typeCountsStr}. Total questions: ${numQuestions}. Ensure no repetition within this set.
  5. For multiple_choice: ${blockRows.filter(b => b.question_type === "multiple_choice").map(b => `${b.question_count} questions with ${b.num_options || 4} options`).join(", ") || "none"}.
  6. Marks: Use positive_marks=${blockRows.map(b => b.positive_marks || 1).join(", ")} and negative_marks=${blockRows.map(b => b.negative_marks || 0).join(", ")} for each question type.
  7. Duration: Use duration_per_question=${blockRows.map(b => b.duration_per_question || 180).join(", ")} seconds for each question type.
  8. End with: ]
  9. No extra text, comments, or incomplete objects. Ensure all fields are present and valid.
  External links for context: ${(assessment.external_links || []).join(", ")}`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: questionPrompt }] }],
      generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
    });
    const text = response.text || (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) || "";
    console.log(`📝 Raw Gemini response (first 500 chars):`, text.substring(0, 500));
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        questions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(questions)) {
          throw new Error("Parsed result is not an array");
        }
        if (questions.length > numQuestions) {
          questions = questions.slice(0, numQuestions);
          console.warn(`⚠️ Truncated ${questions.length - numQuestions} excess questions`);
        }
        const invalidTypes = questions.filter(q => !questionTypes.includes(q.question_type));
        if (invalidTypes.length > 0) {
          throw new Error(`Invalid question types detected: ${invalidTypes.map(q => q.question_type).join(", ")}`);
        }
        const missingFields = questions.filter(q =>
          q.id === undefined ||
          q.question_text === undefined ||
          q.correct_answer === undefined ||
          q.positive_marks === undefined ||
          q.negative_marks === undefined ||
          q.duration_per_question === undefined ||
          (q.question_type === "multiple_choice" && (!q.options || q.options.length !== (blockRows.find(b => b.question_type === "multiple_choice")?.num_options || 4)))
        );
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields in ${missingFields.length} questions`);
        }
        const uniqueQuestions = new Set(questions.map(q => q.question_text));
        if (uniqueQuestions.size !== questions.length) {
          throw new Error(`Duplicate questions detected: ${questions.length - uniqueQuestions.size} duplicates`);
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
        console.error(`❌ Invalid JSON from Gemini:`, e.message, "Raw text sample:", jsonMatch[0].substring(0, 500));
        questions = [];
      }
    } else {
      console.warn(`⚠️ No valid JSON array found in response, sample:`, text.substring(0, 500));
      questions = [];
    }
  } catch (e) {
    console.error(`❌ Failed to generate questions from Gemini:`, e.message, "Prompt sample:", questionPrompt.substring(0, 500));
    questions = [];
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    console.log(`🔄 Falling back to instructor-defined question structure for ${numQuestions} questions`);
    questions = blockRows.flatMap(block => {
      const { question_type, question_count, duration_per_question, num_options, positive_marks, negative_marks } = block;
      return Array.from({ length: question_count }, (_, index) => ({
        id: `${attemptId}-${question_type}-${index + 1}`,
        question_type,
        question_text: `Instructor-defined ${question_type} question ${index + 1} (to be replaced by student input)`,
        options: question_type === "multiple_choice" ? Array(num_options || 4).fill("Option placeholder") : null,
        correct_answer: question_type === "true_false" ? true : "Placeholder answer",
        positive_marks: positive_marks || 1,
        negative_marks: negative_marks || 0,
        duration_per_question: duration_per_question || 180,
      }));
    });
  }

  const totalDuration = questions.reduce((sum, q) => sum + q.duration_per_question, 0);
  await db.query("DELETE FROM generated_questions WHERE attempt_id = $1", [attemptId]);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await db.query(
      `
      INSERT INTO generated_questions (
        attempt_id, question_order, question_type, question_text, options, correct_answer, positive_marks, negative_marks, duration_per_question
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        attemptId,
        i + 1,
        q.question_type,
        q.question_text,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer,
        q.positive_marks,
        q.negative_marks,
        q.duration_per_question,
      ]
    );
  }
  console.log(`✅ Generated and stored ${questions.length} questions for attempt ${attemptId}`);
  return { questions, duration: totalDuration };
};

const enrollStudent = async (assessmentId, email) => {
  try {
    const { rows: userRows } = await db.query("SELECT id, role FROM users WHERE email = $1", [email]);
    if (userRows.length === 0) throw new Error("Student not found");
    const student = userRows[0];
    if (student.role !== "student") throw new Error("User is not a student");

    const { rows: existingRows } = await db.query(
      "SELECT 1 FROM enrollments WHERE assessment_id = $1 AND student_id = $2",
      [assessmentId, student.id]
    );
    if (existingRows.length > 0) throw new Error("Student already enrolled");

    const { rows } = await db.query(
      `
      INSERT INTO enrollments (assessment_id, student_id)
      VALUES ($1, $2)
      RETURNING *
      `,
      [assessmentId, student.id]
    );
    console.log(`✅ Enrolled student ${student.id} in assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error enrolling student:", error);
    throw error;
  }
};

const unenrollStudent = async (assessmentId, studentId) => {
  try {
    const { rows } = await db.query(
      "DELETE FROM enrollments WHERE assessment_id = $1 AND student_id = $2 RETURNING *",
      [assessmentId, studentId]
    );
    if (rows.length === 0) throw new Error("Enrollment not found");
    console.log(`✅ Unenrolled student ${studentId} from assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error unenrolling student:", error);
    throw error;
  }
};

const getEnrolledStudents = async (assessmentId) => {
  try {
    const { rows } = await db.query(
      `
      SELECT u.id, u.email
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.assessment_id = $1
      `,
      [assessmentId]
    );
    console.log(`✅ Retrieved ${rows.length} enrolled students for assessment ${assessmentId}`);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching enrolled students:", error);
    throw error;
  }
};

const linkResourceToAssessment = async (assessmentId, resourceId) => {
  try {
    const resource = await findResourceById(resourceId);
    if (!resource) throw new Error("Resource not found");

    const { rows } = await db.query(
      `
      INSERT INTO assessment_resources (assessment_id, resource_id)
      VALUES ($1, $2)
      ON CONFLICT (assessment_id, resource_id) DO NOTHING
      RETURNING *
      `,
      [assessmentId, resourceId]
    );
    console.log(`✅ Linked resource ${resourceId} to assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error linking resource to assessment:", error);
    throw error;
  }
};

const clearLinksForAssessment = async (assessmentId) => {
  try {
    const { rowCount } = await db.query(
      "UPDATE assessments SET external_links = '[]' WHERE id = $1 RETURNING *",
      [assessmentId]
    );
    if (rowCount === 0) throw new Error("Assessment not found");
    console.log(`✅ Cleared external links for assessment ${assessmentId}`);
    return true;
  } catch (error) {
    console.error("❌ Error clearing links for assessment:", error);
    throw error;
  }
};

const init = async () => {
  try {
    await ensureAssessmentsTable();
    await ensureQuestionBlocksTable();
    await ensureAssessmentResourcesTable();
    await ensureEnrollmentsTable();
    await ensureGeneratedQuestionsTable();
    await ensureAssessmentAttemptsTable();
    await ensureStudentAnswersTable();
    console.log("✅ All assessment-related tables initialized");
  } catch (error) {
    console.error("❌ Error initializing assessment tables:", error);
    throw error;
  }
};

export {
  ensureAssessmentsTable,
  ensureQuestionBlocksTable,
  ensureAssessmentResourcesTable,
  ensureEnrollmentsTable,
  ensureResourceChunksTable,
  ensureGeneratedQuestionsTable,
  ensureAssessmentAttemptsTable,
  ensureStudentAnswersTable,
  createAssessment,
  storeQuestionBlocks,
  getAssessmentsByInstructor,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  storeResourceChunk,
  generateAssessmentQuestions,
  enrollStudent,
  unenrollStudent,
  getEnrolledStudents,
  linkResourceToAssessment,
  clearLinksForAssessment,
  init,
};