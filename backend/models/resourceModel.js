import pool from "../DB/db.js";
import fs from "fs/promises";

export const ensureResourcesTable = async () => {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'resources'
      )
    `);
    if (!tableCheck.rows[0].exists) {
      console.log("Creating resources table...");
      await pool.query(`
        CREATE TABLE resources (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          file_path TEXT,
          file_type VARCHAR(50),
          file_size INTEGER,
          url TEXT,
          content_type VARCHAR(20) NOT NULL,
          visibility VARCHAR(20) DEFAULT 'private',
          uploaded_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await pool.query(`
        CREATE INDEX idx_resources_uploaded_by ON resources(uploaded_by);
      `);
      console.log("✅ resources table created");
    }
  } catch (error) {
    console.error("❌ Error creating resources table:", error);
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

export const createResource = async (resourceData) => {
  if (!resourceData) {
    throw new Error("resourceData is required to create a resource");
  } 
  const { name, file_path, file_type, file_size, url, content_type, visibility, uploaded_by } = resourceData;
  const query = `
    INSERT INTO resources (name, file_path, file_type, file_size, url, content_type, visibility, uploaded_by) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING *
  `;
  const values = [name, file_path, file_type, file_size, url, content_type, visibility, uploaded_by];
  
  try {
    const { rows } = await pool.query(query, values);
    console.log(`✅ Created resource: ID=${rows[0].id}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error creating resource:", error);
    throw error;
  }
};

export const findResourcesByUploader = async (uploadedBy, visibility = null) => {
  let query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.uploaded_by = $1
  `;
  const params = [uploadedBy];
  
  if (visibility) {
    query += ` AND r.visibility = $2`;
    params.push(visibility);
  }
  
  query += ` ORDER BY r.created_at DESC`;
  
  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching resources by uploader:", error);
    throw error;
  }
};

export const findAllResources = async () => {
  const query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.content_type = 'file'
    ORDER BY r.created_at DESC
  `;
  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching all resources:", error);
    throw error;
  }
};

export const findResourceById = async (resourceId) => {
  const query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.id = $1
  `;
  try {
    const { rows } = await pool.query(query, [resourceId]);
    return rows[0];
  } catch (error) {
    console.error("❌ Error fetching resource by ID:", error);
    throw error;
  }
};

export const updateResource = async (resourceId, updateData) => {
  const { name, visibility } = updateData;
  const query = `
    UPDATE resources 
    SET name = COALESCE($1, name), 
        visibility = COALESCE($2, visibility),
        updated_at = NOW()
    WHERE id = $3 
    RETURNING *
  `;
  try {
    const { rows } = await pool.query(query, [name, visibility, resourceId]);
    return rows[0];
  } catch (error) {
    console.error("❌ Error updating resource:", error);
    throw error;
  }
};

export const deleteResource = async (resourceId) => {
  try {
    await pool.query("DELETE FROM resource_chunks WHERE resource_id = $1", [resourceId]);
    const query = `
      DELETE FROM resources 
      WHERE id = $1 
      RETURNING *
    `;
    const { rows } = await pool.query(query, [resourceId]);
    if (rows[0]?.file_path) {
      await fs.unlink(rows[0].file_path).catch(err => console.error("❌ Error deleting file:", err));
    }
    return rows[0];
  } catch (error) {
    console.error("❌ Error deleting resource:", error);
    throw error;
  }
};

export const linkResourceToAssessment = async (assessmentId, resourceId) => {
  const query = `
    INSERT INTO assessment_resources (assessment_id, resource_id) 
    VALUES ($1, $2) 
    ON CONFLICT (assessment_id, resource_id) DO NOTHING
    RETURNING *
  `;
  try {
    const { rows } = await pool.query(query, [assessmentId, resourceId]);
    console.log(`✅ Linked resource ID=${resourceId} to assessment ID=${assessmentId}`);
    return rows[0];
  } catch (error) {
    console.error("❌ Error linking resource to assessment:", error);
    throw error;
  }
};

export const getAssessmentResources = async (assessmentId) => {
  const query = `
    SELECT r.*, u.name as uploader_name, ar.created_at as linked_at
    FROM assessment_resources ar
    JOIN resources r ON ar.resource_id = r.id
    JOIN users u ON r.uploaded_by = u.id
    WHERE ar.assessment_id = $1
    ORDER BY ar.created_at DESC
  `;
  try {
    const { rows } = await pool.query(query, [assessmentId]);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching assessment resources:", error);
    throw error;
  }
};

export const unlinkResourceFromAssessment = async (assessmentId, resourceId) => {
  const query = `
    DELETE FROM assessment_resources 
    WHERE assessment_id = $1 AND resource_id = $2 
    RETURNING *
  `;
  try {
    const { rows } = await pool.query(query, [assessmentId, resourceId]);
    return rows[0];
  } catch (error) {
    console.error("❌ Error unlinking resource from assessment:", error);
    throw error;
  }
};