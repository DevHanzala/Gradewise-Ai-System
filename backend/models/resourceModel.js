import pool from "../DB/db.js"

/**
 * Creates a new resource in the database.
 * @param {Object} resourceData - Resource data object.
 * @returns {Promise<Object>} The newly created resource object.
 */
export const createResource = async (resourceData) => {
   
  if (!resourceData) {
    throw new Error("resourceData is required to create a resource");
  } 
  
  const {
    name,
    filePath,
    fileType,
    fileSize,
    url,
    contentType,
    visibility,
    uploadedBy
  } = resourceData

  const query = `
    INSERT INTO resources (name, file_path, file_type, file_size, url, content_type, visibility, uploaded_by) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING id, name, file_path, file_type, file_size, url, content_type, visibility, uploaded_by, vectorized, created_at
  `
  
  const { rows } = await pool.query(query, [
    name, filePath, fileType, fileSize, url, contentType, visibility, uploadedBy
  ])
  
  return rows[0]
}

/**
 * Finds resources by uploader ID.
 * @param {number} uploadedBy - The ID of the uploader.
 * @param {string} visibility - Optional visibility filter.
 * @returns {Promise<Array>} Array of resources.
 */
export const findResourcesByUploader = async (uploadedBy, visibility = null) => {
  let query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.uploaded_by = $1
  `
  
  const params = [uploadedBy]
  
  if (visibility) {
    query += ` AND r.visibility = $2`
    params.push(visibility)
  }
  
  query += ` ORDER BY r.created_at DESC`
  
  const { rows } = await pool.query(query, params)
  return rows
}

/**
 * Finds a resource by ID.
 * @param {number} resourceId - The ID of the resource.
 * @returns {Promise<Object|undefined>} The resource object if found.
 */
export const findResourceById = async (resourceId) => {
  const query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.id = $1
  `
  const { rows } = await pool.query(query, [resourceId])
  return rows[0]
}

/**
 * Updates a resource in the database.
 * @param {number} resourceId - The ID of the resource to update.
 * @param {Object} updateData - Object containing fields to update.
 * @returns {Promise<Object|undefined>} The updated resource object.
 */
export const updateResource = async (resourceId, updateData) => {
  const { name, visibility, vectorized } = updateData
  
  const query = `
    UPDATE resources 
    SET name = COALESCE($1, name), 
        visibility = COALESCE($2, visibility),
        vectorized = COALESCE($3, vectorized)
    WHERE id = $4 
    RETURNING *
  `
  const { rows } = await pool.query(query, [name, visibility, vectorized, resourceId])
  return rows[0]
}

/**
 * Deletes a resource from the database.
 * @param {number} resourceId - The ID of the resource to delete.
 * @returns {Promise<Object|undefined>} The deleted resource object.
 */
export const deleteResource = async (resourceId) => {
  const query = `
    DELETE FROM resources 
    WHERE id = $1 
    RETURNING *
  `
  const { rows } = await pool.query(query, [resourceId])
  return rows[0]
}

/**
 * Gets all public resources.
 * @returns {Promise<Array>} Array of public resources.
 */
export const getPublicResources = async () => {
  const query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.visibility = 'public'
    ORDER BY r.created_at DESC
  `
  const { rows } = await pool.query(query)
  return rows
}

/**
 * Links a resource to an assessment.
 * @param {number} assessmentId - The ID of the assessment.
 * @param {number} resourceId - The ID of the resource.
 * @returns {Promise<Object>} The created link record.
 */
export const linkResourceToAssessment = async (assessmentId, resourceId) => {
  const query = `
    INSERT INTO assessment_resources (assessment_id, resource_id) 
    VALUES ($1, $2) 
    ON CONFLICT (assessment_id, resource_id) DO NOTHING
    RETURNING *
  `
  const { rows } = await pool.query(query, [assessmentId, resourceId])
  return rows[0]
}

/**
 * Gets resources linked to an assessment.
 * @param {number} assessmentId - The ID of the assessment.
 * @returns {Promise<Array>} Array of linked resources.
 */
export const getAssessmentResources = async (assessmentId) => {
  const query = `
    SELECT r.*, u.name as uploader_name, ar.created_at as linked_at
    FROM assessment_resources ar
    JOIN resources r ON ar.resource_id = r.id
    JOIN users u ON r.uploaded_by = u.id
    WHERE ar.assessment_id = $1
    ORDER BY ar.created_at DESC
  `
  const { rows } = await pool.query(query, [assessmentId])
  return rows
}

/**
 * Removes a resource link from an assessment.
 * @param {number} assessmentId - The ID of the assessment.
 * @param {number} resourceId - The ID of the resource.
 * @returns {Promise<Object|undefined>} The removed link record.
 */
export const unlinkResourceFromAssessment = async (assessmentId, resourceId) => {
  const query = `
    DELETE FROM assessment_resources 
    WHERE assessment_id = $1 AND resource_id = $2 
    RETURNING *
  `
  const { rows } = await pool.query(query, [assessmentId, resourceId])
  return rows[0]
}

/**
 * Gets resources that need vectorization.
 * @returns {Promise<Array>} Array of resources pending vectorization.
 */
export const getResourcesForVectorization = async () => {
  const query = `
    SELECT r.*, u.name as uploader_name
    FROM resources r
    JOIN users u ON r.uploaded_by = u.id
    WHERE r.vectorized = false AND r.content_type = 'file'
    ORDER BY r.created_at ASC
  `
  const { rows } = await pool.query(query)
  return rows
}
