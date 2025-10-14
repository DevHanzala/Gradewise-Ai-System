import pool from "../DB/db.js";
import { findResourceById } from "./resourceModel.js";
import { getCreationModel, mapLanguageCode } from "../services/geminiService.js";

export const ensureAssessmentsTable = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessments'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessments table...");
      await pool.query(`
        CREATE TABLE assessments (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          prompt TEXT,
          external_links JSONB DEFAULT '[]',
          instructor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          is_published BOOLEAN DEFAULT FALSE,
          is_executed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_assessments_instructor_id ON assessments(instructor_id);
      `);
      console.log("✅ assessments table created");
    } else {
      await pool.query(`
        ALTER TABLE assessments
        ALTER COLUMN prompt DROP NOT NULL;
      `);
      console.log("✅ assessments table updated (prompt made optional)");
    }
  } catch (error) {
    console.error("❌ Error creating/updating assessments table:", error);
    throw error;
  }
};

export const ensureQuestionBlocksTable = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'question_blocks'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating question_blocks table...");
      await pool.query(`
        CREATE TABLE question_blocks (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          question_type VARCHAR(50) NOT NULL,
          question_count INTEGER NOT NULL,
          duration_per_question INTEGER NOT NULL DEFAULT 120,
          num_options INTEGER,
          num_first_side INTEGER,
          num_second_side INTEGER,
          positive_marks NUMERIC,
          negative_marks NUMERIC,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_question_blocks_assessment_id ON question_blocks(assessment_id);
      `);
      console.log("✅ question_blocks table created");
    } else {
      console.log("Checking for missing columns or type updates in question_blocks table...");
      await pool.query(`
        DO $$ 
        BEGIN
          ALTER TABLE question_blocks
            ADD COLUMN IF NOT EXISTS duration_per_question INTEGER NOT NULL DEFAULT 120,
            ADD COLUMN IF NOT EXISTS num_options INTEGER,
            ADD COLUMN IF NOT EXISTS num_first_side INTEGER,
            ADD COLUMN IF NOT EXISTS num_second_side INTEGER,
            ADD COLUMN IF NOT EXISTS positive_marks NUMERIC,
            ADD COLUMN IF NOT EXISTS negative_marks NUMERIC;
          -- Update existing columns to NUMERIC if they are still INTEGER
          ALTER TABLE question_blocks
            ALTER COLUMN positive_marks TYPE NUMERIC USING (positive_marks::NUMERIC),
            ALTER COLUMN negative_marks TYPE NUMERIC USING (negative_marks::NUMERIC);
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

export const ensureAssessmentResourcesTable = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_resources'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessment_resources table...");
      await pool.query(`
        CREATE TABLE assessment_resources (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
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

export const ensureEnrollmentsTable = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enrollments'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating enrollments table...");
      await pool.query(`
        CREATE TABLE enrollments (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(assessment_id, student_id)
        )
      `);
      await pool.query(`
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

export const ensureResourceChunksTable = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'resource_chunks'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating resource_chunks table...");
      await pool.query(`
        CREATE TABLE resource_chunks (
          id SERIAL PRIMARY KEY,
          resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
          chunk_text TEXT NOT NULL,
          embedding VECTOR(384),
          chunk_index INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_resource_chunks_resource_id ON resource_chunks(resource_id);
      `);
      console.log("✅ resource_chunks table created");
    }
  } catch (error) {
    console.error("❌ Error creating resource_chunks table:", error);
    throw error;
  }
};

export const createAssessment = async (assessmentData) => {
  const { title, prompt, external_links, instructor_id, is_executed = false } = assessmentData;
  const query = `
    INSERT INTO assessments (title, prompt, external_links, instructor_id, is_executed)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const validExternalLinks = Array.isArray(external_links) ? external_links.filter(link => link && typeof link === "string" && link.trim() !== "") : [];
  try {
    const { rows } = await pool.query(query, [title, prompt || null, JSON.stringify(validExternalLinks), instructor_id, is_executed]);
    console.log(`✅ Created assessment: ID=${rows[0].id}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error creating assessment:", error);
    throw error;
  }
};

export const storeQuestionBlocks = async (assessmentId, questionBlocks, instructorId) => {
  try {
    await pool.query("DELETE FROM question_blocks WHERE assessment_id = $1", [assessmentId]);
    for (const block of questionBlocks) {
      const { question_type, question_count, duration_per_question, num_options, num_first_side, num_second_side, positive_marks, negative_marks } = block;
      await pool.query(
        `
        INSERT INTO question_blocks (
          assessment_id, 
          question_type, 
          question_count, 
          duration_per_question, 
          num_options, 
          num_first_side, 
          num_second_side, 
          positive_marks, 
          negative_marks, 
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          assessmentId,
          question_type,
          question_count,
          duration_per_question,
          num_options || null,
          num_first_side || null,
          num_second_side || null,
          positive_marks || null,
          negative_marks || null,
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

export const getAssessmentsByInstructor = async (instructorId) => {
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
                  'num_first_side', qb.num_first_side,
                  'num_second_side', qb.num_second_side,
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
    const { rows } = await pool.query(query, [instructorId]);
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

export const getAssessmentById = async (assessment_id, user_id, user_role) => {
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
                     'num_first_side', qb.num_first_side,
                     'num_second_side', qb.num_second_side,
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
                     'num_first_side', qb.num_first_side,
                     'num_second_side', qb.num_second_side,
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
    const result = await pool.query(query, values);
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

export const updateAssessment = async (assessmentId, updateData) => {
  const { title, prompt, external_links } = updateData;
  const query = `
    UPDATE assessments
    SET title = $1, prompt = $2, external_links = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `;
  const validExternalLinks = Array.isArray(external_links) ? external_links.filter(link => link && typeof link === "string" && link.trim() !== "") : [];
  try {
    const { rows } = await pool.query(query, [title, prompt || null, JSON.stringify(validExternalLinks), assessmentId]);
    if (rows.length === 0) throw new Error("Assessment not found");
    console.log(`✅ Assessment updated: ID=${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error updating assessment:", error);
    throw error;
  }
};

export const deleteAssessment = async (assessmentId) => {
  try {
    const { rows } = await pool.query("DELETE FROM assessments WHERE id = $1 RETURNING *", [assessmentId]);
    if (rows.length === 0) throw new Error("Assessment not found");
    console.log(`✅ Deleted assessment: ID=${assessmentId}`);
  } catch (error) {
    console.error("❌ Error deleting assessment:", error);
    throw error;
  }
};

export const storeResourceChunk = async (resourceId, chunkText, embedding, metadata) => {
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
    const values = [resourceId, chunkText, `[${embedding.join(',')}]`, metadata.chunk_index];
    const { rows } = await pool.query(query, values);
    console.log(`✅ Stored chunk for resource ${resourceId}, index ${metadata.chunk_index}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error storing resource chunk:", error);
    throw error;
  }
};

export const generateAssessmentQuestions = async (assessmentId, attemptId, language, assessment) => {
  const { rows: blockRows } = await pool.query(
    `SELECT question_type, question_count, COALESCE(duration_per_question, 180) AS duration_per_question, num_options, num_first_side, num_second_side, positive_marks, negative_marks 
     FROM question_blocks 
     WHERE assessment_id = $1`,
    [assessmentId]
  );
  if (blockRows.length === 0) {
    throw new Error(`No question blocks defined for assessment ${assessmentId}`);
  }

  const questionTypes = [...new Set(blockRows.map(b => b.question_type))];
  const numQuestions = blockRows.reduce((sum, b) => sum + b.question_count, 0);
  const typeCountsStr = blockRows.map(b => `${b.question_count} ${b.question_type}`).join(", ");

  let questions = [];
  const model = getCreationModel("gemini-1.5-flash");
  const langName = mapLanguageCode(language);
  let questionPrompt = `Generate a complete and valid JSON array of unique assessment questions in ${langName} based on the assessment title "${assessment.title}" and prompt "${assessment.prompt || 'No additional info provided'}". Follow these rules strictly:
  1. Start with: [
  2. Each question must have: id, question_type, question_text, options (array of num_options for multiple_choice, array of pairs for matching with num_first_side and num_second_side, null for true_false or short_answer), correct_answer (string for multiple_choice/short_answer, boolean for true_false, array of pairs for matching), marks.
  3. Use only the following question types: ${questionTypes.join(", ")}.
  4. Include exactly these counts: ${typeCountsStr}. Total questions: ${numQuestions}. Ensure no repetition within this set.
  5. For multiple_choice: ${blockRows.filter(b => b.question_type === "multiple_choice").map(b => `${b.question_count} questions with ${b.num_options || 4} options`).join(", ") || "none"}.
  6. For matching: ${blockRows.filter(b => b.question_type === "matching").map(b => `${b.question_count} questions with ${b.num_first_side || 4} first-side and ${b.num_second_side || 4} second-side options`).join(", ") || "none"}.
  7. Marks: Use positive_marks=${blockRows.map(b => b.positive_marks || 1).join(", ")} and negative_marks=${blockRows.map(b => b.negative_marks || 0).join(", ")} where specified.
  8. End with: ]
  9. No extra text, comments, or incomplete objects. Ensure all fields are present and valid.
  External links for context: ${(assessment.external_links || []).join(", ")}`;

  try {
    const gen = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: questionPrompt }] }],
      generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
    });
    const text = (await gen.response).text();
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
          (q.question_type === "multiple_choice" && (!q.options || q.options.length !== (blockRows.find(b => b.question_type === "multiple_choice")?.num_options || 4))) ||
          (q.question_type === "matching" && (!q.options || !Array.isArray(q.options) || q.options.length !== (blockRows.find(b => b.question_type === "matching")?.num_first_side || 4) || !q.correct_answer || !Array.isArray(q.correct_answer) || q.correct_answer.length !== (blockRows.find(b => b.question_type === "matching")?.num_first_side || 4)))
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
        console.error(`❌ Invalid JSON from Gemini:`, e.message);
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
    console.log(`🔄 Falling back to instructor-defined question structure for ${numQuestions} questions`);
    questions = blockRows.flatMap(block => {
      const { question_type, question_count, num_options, num_first_side, num_second_side, positive_marks, negative_marks } = block;
      return Array.from({ length: question_count }, (_, index) => ({
        id: `${assessmentId}-${question_type}-${index + 1}`,
        question_type,
        question_text: `Instructor-defined ${question_type} question ${index + 1} (to be replaced by student input)`,
        options: question_type === "multiple_choice" ? Array(num_options || 4).fill().map((_, i) => `Option ${String.fromCharCode(65 + i)}`) : 
                 question_type === "matching" ? Array(num_first_side || 4).fill().map((_, i) => [`Item ${i + 1}`, `Match ${i + 1}`]) : null,
        correct_answer: question_type === "multiple_choice" ? `Option A` : 
                        question_type === "true_false" ? true : 
                        question_type === "matching" ? Array(num_first_side || 4).fill().map((_, i) => [`Item ${i + 1}`, `Match ${i + 1}`]) : 
                        "Sample answer",
        marks: positive_marks || 1,
      }));
    });
  }

  if (questions.length < numQuestions) {
    console.warn(`⚠️ Generated only ${questions.length} questions instead of ${numQuestions}. Proceeding with available questions.`);
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const options = Array.isArray(q.options) ? JSON.stringify(q.options) : null;
    await pool.query(
      `INSERT INTO generated_questions (attempt_id, question_order, question_type, question_text, options, correct_answer, marks)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [attemptId, i + 1, q.question_type, q.question_text, options, q.correct_answer, q.marks]
    );
  }

  const duration = blockRows.reduce((sum, block) => sum + block.question_count * (block.duration_per_question || 180), 0) / 60;
  console.log(`✅ Calculated duration: ${duration} minutes for ${numQuestions} questions`);

  return { questions, duration };
};

export const enrollStudent = async (assessmentId, studentEmail) => {
  try {
    const userQuery = await pool.query("SELECT id FROM users WHERE email = $1", [studentEmail]);
    if (userQuery.rows.length === 0) {
      throw new Error("Student not found");
    }
    const studentId = userQuery.rows[0].id;

    const query = `
      INSERT INTO enrollments (assessment_id, student_id, enrolled_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (assessment_id, student_id) DO NOTHING
      RETURNING *
    `;
    const { rows } = await pool.query(query, [assessmentId, studentId]);
    if (rows.length === 0) {
      throw new Error("Student already enrolled");
    }
    console.log(`✅ Enrolled student ${studentId} to assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error enrolling student:", error);
    throw error;
  }
};

export const unenrollStudent = async (assessmentId, studentId) => {
  try {
    const query = `
      DELETE FROM enrollments
      WHERE assessment_id = $1 AND student_id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [assessmentId, studentId]);
    if (rows.length === 0) {
      throw new Error("Student not enrolled in this assessment");
    }
    console.log(`✅ Unenrolled student ${studentId} from assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error unenrolling student:", error);
    throw error;
  }
};

export const getEnrolledStudents = async (assessmentId) => {
  try {
    const query = `
      SELECT u.id, u.name, u.email
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.assessment_id = $1
    `;
    const { rows } = await pool.query(query, [assessmentId]);
    console.log(`✅ Fetched ${rows.length} enrolled students for assessment ${assessmentId}`);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching enrolled students:", error);
    throw error;
  }
};

export const clearLinksForAssessment = async (assessmentId) => {
  try {
    const query = `
      UPDATE assessments
      SET external_links = '[]'
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [assessmentId]);
    if (rows.length === 0) {
      throw new Error("Assessment not found");
    }
    console.log(`✅ Cleared external links for assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error clearing external links:", error);
    throw error;
  }
};

export const init = async () => {
  try {
    if (!pool) {
      throw new Error("Database pool not initialized");
    }
    // Create tables in order to respect foreign key dependencies
    await ensureAssessmentsTable();
    await ensureQuestionBlocksTable();
    await ensureAssessmentResourcesTable();
    await ensureEnrollmentsTable();
    await ensureResourceChunksTable();
    console.log("✅ All assessment-related tables initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing assessment tables:", error);
    throw error;
  }
};