import pool from "../DB/db.js";
import { getAssessmentResources } from "./resourceModel.js";

export const createAssessment = async (assessmentData) => {
  const { title, prompt, external_links = [], instructor_id, is_executed = false } = assessmentData;
  const query = `
    INSERT INTO assessments (
      title, prompt, external_links, instructor_id, is_executed, created_at, updated_at
    ) 
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `;
  const values = [title, prompt, JSON.stringify(external_links), instructor_id, is_executed];

  try {
    const result = await pool.query(query, values);
    console.log(`✅ Created assessment: ID=${result.rows[0].id}`);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error creating assessment:", error);
    throw error;
  }
};

export const getAssessmentById = async (id, user_id = null, user_role = null) => {
  const query = `
    SELECT 
      a.*,
      u.name as instructor_name,
      u.email as instructor_email,
      (SELECT json_agg(r.*) 
       FROM resources r
       JOIN assessment_resources ar ON r.id = ar.resource_id
       WHERE ar.assessment_id = a.id) AS resources,
      (SELECT json_agg(qb.*) 
       FROM question_blocks qb
       WHERE qb.assessment_id = a.id) AS question_blocks,
      (SELECT COUNT(*) FROM question_blocks qb WHERE qb.assessment_id = a.id) AS question_blocks_count
    FROM assessments a
    LEFT JOIN users u ON a.instructor_id = u.id
    WHERE a.id = $1
  `;
  try {
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    const assessment = result.rows[0];
    if (user_role === "instructor" && assessment.instructor_id !== Number.parseInt(user_id)) {
      return null;
    }
    if (typeof assessment.external_links === "string") {
      assessment.external_links = JSON.parse(assessment.external_links);
    }
    if (typeof assessment.resources === "string") {
      assessment.resources = JSON.parse(assessment.resources) || [];
    }
    if (typeof assessment.question_blocks === "string") {
      assessment.question_blocks = JSON.parse(assessment.question_blocks) || [];
    }
    return assessment;
  } catch (error) {
    console.error("❌ Error fetching assessment by ID:", error);
    throw error;
  }
};

export const updateAssessment = async (id, updateData) => {
  const checkQuery = `SELECT is_executed FROM assessments WHERE id = $1`;
  const checkResult = await pool.query(checkQuery, [id]);
  if (checkResult.rows.length === 0) {
    throw new Error("Assessment not found");
  }
  if (checkResult.rows[0].is_executed) {
    throw new Error("Cannot update an executed assessment");
  }

  const allowedFields = ["title", "prompt", "external_links"];
  const updates = [];
  const values = [];
  let paramCounter = 1;

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updates.push(`${field} = $${paramCounter}`);
      values.push(field === "external_links" ? JSON.stringify(updateData[field]) : updateData[field]);
      paramCounter++;
    }
  }

  updates.push(`updated_at = NOW()`);
  if (updates.length === 1) {
    return await getAssessmentById(id);
  }

  const query = `
    UPDATE assessments
    SET ${updates.join(", ")}
    WHERE id = $${paramCounter}
    RETURNING *
  `;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    const assessment = result.rows[0];
    if (typeof assessment.external_links === "string") {
      assessment.external_links = JSON.parse(assessment.external_links);
    }
    console.log(`✅ Updated assessment: ID=${id}`);
    return assessment;
  } catch (error) {
    console.error("❌ Error updating assessment:", error);
    throw error;
  }
};

export const deleteAssessment = async (id) => {
  try {
    await pool.query("DELETE FROM assessment_resources WHERE assessment_id = $1", [id]);
    await pool.query("DELETE FROM question_blocks WHERE assessment_id = $1", [id]);
    await pool.query("DELETE FROM resource_chunks WHERE resource_id IN (SELECT resource_id FROM assessment_resources WHERE assessment_id = $1)", [id]);
    const result = await pool.query("DELETE FROM assessments WHERE id = $1", [id]);
    console.log(`✅ Deleted assessment: ID=${id}`);
    return result.rowCount > 0;
  } catch (error) {
    console.error("❌ Error deleting assessment:", error);
    throw error;
  }
};

export const getAssessmentsByInstructor = async (instructor_id) => {
  const query = `
    SELECT 
      a.id,
      a.title,
      a.prompt,
      a.external_links,
      a.is_executed,
      a.created_at,
      a.updated_at,
      (SELECT COUNT(*) FROM question_blocks qb WHERE qb.assessment_id = a.id) AS question_blocks_count
    FROM assessments a
    WHERE a.instructor_id = $1
    ORDER BY a.created_at DESC
  `;
  try {
    const result = await pool.query(query, [instructor_id]);
    return result.rows.map(row => ({
      ...row,
      external_links: typeof row.external_links === "string" ? JSON.parse(row.external_links) : row.external_links
    }));
  } catch (error) {
    console.error("❌ Error fetching assessments by instructor:", error);
    throw error;
  }
};

export const storeQuestionBlocks = async (assessmentId, questionBlocks, instructorId) => {
  try {
    await pool.query("DELETE FROM question_blocks WHERE assessment_id = $1", [assessmentId]);
    let totalBlocks = 0;
    if (questionBlocks.length > 0) {
      const insertBlockQuery = `
        INSERT INTO question_blocks (
          assessment_id, question_type, question_count, block_order, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      for (let i = 0; i < questionBlocks.length; i++) {
        const block = questionBlocks[i];
        const blockValues = [assessmentId, block.question_type, block.question_count, i + 1, instructorId];
        await pool.query(insertBlockQuery, blockValues);
        totalBlocks++;
      }
    }
    console.log(`✅ Stored ${totalBlocks} question blocks for assessment ID=${assessmentId}`);
    return { blocks: totalBlocks };
  } catch (error) {
    console.error("❌ Error storing question blocks:", error);
    throw error;
  }
};

export const storeResourceChunk = async (resourceId, chunkText, embedding, metadata) => {
  // Ensure embedding is an array
  if (!Array.isArray(embedding)) {
    console.error("❌ Embedding is not an array:", embedding);
    throw new Error("Embedding must be an array");
  }

  // Convert embedding array to pgvector-compatible string
  const vectorString = `[${embedding.map(num => Number(num).toFixed(8)).join(",")}]`;

  const query = `
    INSERT INTO resource_chunks (
      resource_id, chunk_text, embedding, metadata, created_at
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  `;
  const values = [resourceId, chunkText, vectorString, JSON.stringify(metadata)];

  try {
    const result = await pool.query(query, values);
    console.log(`✅ Stored chunk for resource ID=${resourceId}, chunk_index=${metadata.chunk_index}`);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error storing resource chunk:", error);
    throw error;
  }
};

export const clearLinksForAssessment = async (assessmentId) => {
  try {
    await pool.query("DELETE FROM assessment_resources WHERE assessment_id = $1", [assessmentId]);
    console.log(`✅ Cleared resource links for assessment ID=${assessmentId}`);
  } catch (error) {
    console.error("❌ Error clearing resource links:", error);
    throw error;
  }
};

export const ensureAssessmentsTable = async () => {
  try {
    // Enable pgvector extension
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");

    // Check if assessments table exists
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
          instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_executed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_assessments_instructor_id ON assessments(instructor_id);
        CREATE INDEX idx_assessments_created_at ON assessments(created_at);
      `);
      console.log("✅ assessments table created successfully");
    } else {
      console.log("✅ assessments table already exists - checking columns");
      const promptCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'assessments' 
          AND column_name = 'prompt'
        )
      `);
      if (!promptCheck.rows[0].exists) {
        await pool.query("ALTER TABLE assessments ADD COLUMN prompt TEXT NOT NULL DEFAULT ''");
      }
      const linksCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'assessments' 
          AND column_name = 'external_links'
        )
      `);
      if (!linksCheck.rows[0].exists) {
        await pool.query("ALTER TABLE assessments ADD COLUMN external_links JSONB DEFAULT '[]'");
      }
      const executedCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'assessments' 
          AND column_name = 'is_executed'
        )
      `);
      if (!executedCheck.rows[0].exists) {
        await pool.query("ALTER TABLE assessments ADD COLUMN is_executed BOOLEAN DEFAULT FALSE");
      }
    }

    // question_blocks table
    const questionBlocksCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'question_blocks'
      )
    `);
    if (!questionBlocksCheck.rows[0].exists) {
      console.log("Creating question_blocks table...");
      await pool.query(`
        CREATE TABLE question_blocks (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          question_type VARCHAR(50) NOT NULL,
          question_count INTEGER NOT NULL DEFAULT 1,
          block_order INTEGER NOT NULL DEFAULT 1,
          created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_question_blocks_assessment_id ON question_blocks(assessment_id);
      `);
      console.log("✅ question_blocks table created successfully");
    } else {
      console.log("✅ question_blocks table already exists - checking columns");
      const createdByCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'question_blocks' 
          AND column_name = 'created_by'
        )
      `);
      if (!createdByCheck.rows[0].exists) {
        console.log("Adding created_by column to question_blocks...");
        await pool.query(`
          ALTER TABLE question_blocks
          ADD COLUMN created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
        `);
        console.log("✅ created_by column added to question_blocks");
      }
    }

    // assessment_resources link table
    const arCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_resources'
      )
    `);
    if (!arCheck.rows[0].exists) {
      await pool.query(`
        CREATE TABLE assessment_resources (
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
          PRIMARY KEY (assessment_id, resource_id)
        )
      `);
      console.log("✅ assessment_resources table created successfully");
    }

    // resource_chunks table
    const chunksCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'resource_chunks'
      )
    `);
    if (!chunksCheck.rows[0].exists) {
      console.log("Creating resource_chunks table...");
      await pool.query(`
        CREATE TABLE resource_chunks (
          id SERIAL PRIMARY KEY,
          resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
          chunk_text TEXT NOT NULL,
          embedding vector(384),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_resource_chunks_resource_id ON resource_chunks(resource_id);
      `);
      console.log("✅ resource_chunks table created successfully");
    } else {
      console.log("✅ resource_chunks table already exists - checking columns");
      const embeddingCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'resource_chunks' 
          AND column_name = 'embedding'
        )
      `);
      if (!embeddingCheck.rows[0].exists) {
        console.log("Adding embedding column to resource_chunks...");
        await pool.query(`
          ALTER TABLE resource_chunks
          ADD COLUMN embedding vector(384)
        `);
        console.log("✅ embedding column added to resource_chunks");
      }
      const metadataCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'resource_chunks' 
          AND column_name = 'metadata'
        )
      `);
      if (!metadataCheck.rows[0].exists) {
        console.log("Adding metadata column to resource_chunks...");
        await pool.query(`
          ALTER TABLE resource_chunks
          ADD COLUMN metadata JSONB DEFAULT '{}'
        `);
        console.log("✅ metadata column added to resource_chunks");
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Error ensuring assessments tables:", error);
    throw error;
  }
};