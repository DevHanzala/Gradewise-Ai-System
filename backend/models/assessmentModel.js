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
          prompt TEXT NOT NULL,
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
    }
  } catch (error) {
    console.error("❌ Error creating assessments table:", error);
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
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_question_blocks_assessment_id ON question_blocks(assessment_id);
      `);
      console.log("✅ question_blocks table created");
    }
  } catch (error) {
    console.error("❌ Error creating question_blocks table:", error);
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

export const createAssessment = async (assessmentData) => {
  const { title, prompt, external_links, instructor_id, is_executed = false } = assessmentData;
  const query = `
    INSERT INTO assessments (title, prompt, external_links, instructor_id, is_executed)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const validExternalLinks = Array.isArray(external_links) ? external_links.filter(link => link && typeof link === "string" && link.trim() !== "") : [];
  console.log(`🔍 Creating assessment with external_links:`, validExternalLinks);
  try {
    const { rows } = await pool.query(query, [title, prompt, JSON.stringify(validExternalLinks), instructor_id, is_executed]);
    console.log(`✅ Created assessment: ID=${rows[0].id}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error creating assessment:", error);
    throw error;
  }
};

export const storeQuestionBlocks = async (assessmentId, questionBlocks, instructorId) => {
  try {
    console.log(`🔍 Storing question blocks for assessment ${assessmentId} with instructorId: ${instructorId}`);
    if (!instructorId) {
      throw new Error("instructorId is null or undefined");
    }
    await pool.query("DELETE FROM question_blocks WHERE assessment_id = $1", [assessmentId]);
    for (const block of questionBlocks) {
      const { question_type, question_count } = block;
      console.log(`🔍 Inserting question block: type=${question_type}, count=${question_count}, created_by=${instructorId}`);
      await pool.query(
        `
        INSERT INTO question_blocks (assessment_id, question_type, question_count, created_by)
        VALUES ($1, $2, $3, $4)
        `,
        [assessmentId, question_type, question_count, instructorId]
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
           (SELECT json_agg(
              json_build_object(
                'id', qb.id,
                'question_type', qb.question_type,
                'question_count', qb.question_count
              )
           ) FROM question_blocks qb WHERE qb.assessment_id = a.id) as question_blocks,
           (SELECT json_agg(
              json_build_object(
                'id', r.id,
                'name', r.name,
                'type', r.file_type,
                'content_type', r.content_type,
                'url', r.url
              )
           ) FROM assessment_resources ar JOIN resources r ON ar.resource_id = r.id WHERE ar.assessment_id = a.id) as resources
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
               ARRAY_AGG(
                 json_build_object(
                   'question_type', qb.question_type,
                   'question_count', qb.question_count
                 )
               ) AS question_blocks,
               ARRAY_AGG(
                 json_build_object(
                   'id', r.id,
                   'name', r.name,
                   'file_path', r.file_path,
                   'file_type', r.file_type
                 )
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
               ARRAY_AGG(
                 json_build_object(
                   'question_type', qb.question_type,
                   'question_count', qb.question_count
                 )
               ) AS question_blocks,
               ARRAY_AGG(
                 json_build_object(
                   'id', r.id,
                   'name', r.name,
                   'file_path', r.file_path,
                   'file_type', r.file_type
                 )
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
  console.log(`🔍 Updating assessment ${assessmentId} with external_links:`, validExternalLinks);
  try {
    const { rows } = await pool.query(query, [title, prompt, JSON.stringify(validExternalLinks), assessmentId]);
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
    // Format embedding as PostgreSQL vector string: '[num1,num2,...]'
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      throw new Error("Invalid embedding: must be an array of 384 numbers");
    }
    const embeddingString = '[' + embedding.map(num => num.toString()).join(',') + ']';
    console.log(`🔍 Formatted embedding string (sample): ${embeddingString.slice(0, 50)}...`);

    const query = `
      INSERT INTO resource_chunks (resource_id, chunk_text, embedding, chunk_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [resourceId, chunkText, embeddingString, metadata.chunk_index];
    const { rows } = await pool.query(query, values);
    console.log(`✅ Stored chunk for resource ${resourceId}, index ${metadata.chunk_index}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error storing resource chunk:", error);
    throw error;
  }
};

export const linkResourceToAssessment = async (assessmentId, resourceId) => {
  try {
    const resource = await findResourceById(resourceId);
    if (!resource) throw new Error("Resource not found");
    
    const query = `
      INSERT INTO assessment_resources (assessment_id, resource_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    const { rows } = await pool.query(query, [assessmentId, resourceId]);
    console.log(`✅ Linked resource ${resourceId} to assessment ${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error linking resource to assessment:", error);
    throw error;
  }
};

export const clearLinksForAssessment = async (assessmentId) => {
  try {
    await pool.query("DELETE FROM assessment_resources WHERE assessment_id = $1", [assessmentId]);
    console.log(`✅ Cleared resource links for assessment ${assessmentId}`);
  } catch (error) {
    console.error("❌ Error clearing resource links:", error);
    throw error;
  }
};

export const enrollStudent = async (assessmentId, studentId) => {
  try {
    const query = `
      INSERT INTO enrollments (assessment_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT (assessment_id, student_id) DO NOTHING
      RETURNING *
    `;
    const { rows } = await pool.query(query, [assessmentId, studentId]);
    if (rows.length === 0) {
      throw new Error("Student already enrolled or invalid data");
    }
    console.log(`✅ Enrolled student ${studentId} in assessment ${assessmentId}`);
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
      throw new Error("Enrollment not found");
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
      SELECT u.id, u.name, u.email, e.enrolled_at
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.assessment_id = $1
      ORDER BY e.enrolled_at DESC
    `;
    const { rows } = await pool.query(query, [assessmentId]);
    console.log(`✅ Fetched ${rows.length} enrolled students for assessment ${assessmentId}`);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching enrolled students:", error);
    throw error;
  }
};

export const generateAssessmentQuestions = async (assessmentId, attemptId, language, assessment) => {
  // Fetch question blocks to determine types and counts
  const { rows: blockRows } = await pool.query(
    `SELECT question_type, question_count FROM question_blocks WHERE assessment_id = $1`,
    [assessmentId]
  );
  if (blockRows.length === 0) {
    throw new Error(`No question blocks defined for assessment ${assessmentId}`);
  }

  const questionTypes = [...new Set(blockRows.map(b => b.question_type))];
  const numQuestions = blockRows.reduce((sum, b) => sum + b.question_count, 0);
  const typeCountsStr = blockRows.map(b => `${b.question_count} ${b.question_type}`).join(", ");

  console.log(`📊 Using instructor-defined questions: ${typeCountsStr} (total ${numQuestions})`);

  // Generate questions via Gemini or fall back to instructor-defined structure
  let questions = [];
  const model = getCreationModel("gemini-1.5-pro"); // Explicitly use a stable model
  const langName = mapLanguageCode(language);
  let questionPrompt = `Generate a complete and valid JSON array of unique assessment questions in ${langName} based on the assessment title "${assessment.title}" and prompt "${assessment.prompt}". Follow these rules strictly:
  1. Start with: [
  2. Each question must have: id, question_type, question_text, options (array of 4 for multiple_choice, array of pairs for matching, null for true_false or short_answer), correct_answer (string for multiple_choice/short_answer, boolean for true_false, array of pairs for matching), marks.
  3. Use only the following question types: ${questionTypes.join(", ")}.
  4. Include exactly these counts: ${typeCountsStr}. Total questions: ${numQuestions}. Ensure no repetition within this set.
  5. End with: ]
  6. No extra text, comments, or incomplete objects. Ensure all fields (id, question_type, question_text, options, correct_answer, marks) are present and valid for each question.
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

  // Fallback to instructor-defined question structure if Gemini fails
  if (!Array.isArray(questions) || questions.length === 0) {
    console.log(`🔄 Falling back to instructor-defined question structure for ${numQuestions} questions`);
    questions = blockRows.flatMap(block => {
      const { question_type, question_count } = block;
      return Array.from({ length: question_count }, (_, index) => ({
        id: `${assessmentId}-${question_type}-${index + 1}`,
        question_type,
        question_text: `Instructor-defined ${question_type} question ${index + 1} (to be replaced by student input)`,
        options: question_type === "multiple_choice" ? ["Option A", "Option B", "Option C", "Option D"] : null,
        correct_answer: question_type === "multiple_choice" ? "Option A" : question_type === "true_false" ? true : "Sample answer",
        marks: 1,
      }));
    });
  }

  if (questions.length < numQuestions) {
    console.warn(`⚠️ Generated only ${questions.length} questions instead of ${numQuestions}. Proceeding with available questions.`);
  }

  // Store questions in the database
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const options = Array.isArray(q.options) ? JSON.stringify(q.options) : null;
    console.log(`📋 Inserting question ${i + 1}:`, { question_text: q.question_text, options, correct_answer: q.correct_answer });
    await pool.query(
      `INSERT INTO generated_questions (attempt_id, question_order, question_type, question_text, options, correct_answer, marks)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [attemptId, i + 1, q.question_type, q.question_text, options, q.correct_answer, q.marks]
    );
  }

  // Estimate duration
  let duration = Math.ceil(questions.length * 3 / 5) * 5;
  try {
    const durationPrompt = `Estimate the duration (in minutes) for an assessment with ${questions.length} questions of types ${questionTypes.join(", ")}. Guidelines: 2-3 minutes per multiple_choice, 1-2 minutes per true_false, 3-4 minutes per matching, 2-3 minutes per short_answer, return a single number rounded up to the nearest 5.`;
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

  return { questions, duration };
};