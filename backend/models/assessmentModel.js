import pool from "../DB/db.js"

/**
 * Creates a new assessment in the database.
 * @param {Object} assessmentData - Assessment data
 * @returns {Promise<Object>} The created assessment
 */
export const createAssessment = async (assessmentData) => {
  try {
    const {
      title,
      description,
      instructor_id,
      duration,
      total_marks,
      passing_marks,
      instructions,
      is_published,
      start_date,
      end_date,
      question_blocks,
    } = assessmentData

    // Start transaction
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Insert assessment
      const assessmentQuery = `
        INSERT INTO assessments (title, description, instructor_id, duration, total_marks, passing_marks, instructions, is_published, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `

      const assessmentResult = await client.query(assessmentQuery, [
        title,
        description,
        instructor_id,
        duration,
        total_marks,
        passing_marks,
        instructions,
        is_published,
        start_date,
        end_date,
      ])

      const assessment = assessmentResult.rows[0]

      // Insert question blocks if provided
      if (question_blocks && question_blocks.length > 0) {
        for (const block of question_blocks) {
          const blockQuery = `
            INSERT INTO question_blocks (assessment_id, block_title, block_description, question_count, marks_per_question, difficulty_level, question_type, topics)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `

          await client.query(blockQuery, [
            assessment.id,
            block.block_title,
            block.block_description,
            block.question_count,
            block.marks_per_question,
            block.difficulty_level,
            block.question_type,
            block.topics,
          ])
        }
      }

      await client.query("COMMIT")

      // Fetch complete assessment with question blocks
      const completeAssessment = await getAssessmentById(assessment.id)
      return completeAssessment
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Database error in createAssessment:", error)
    throw new Error("Failed to create assessment")
  }
}

/**
 * Gets all assessments for a specific instructor.
 * @param {number} instructorId - The instructor's ID
 * @returns {Promise<Array>} Array of assessments
 */
export const getAssessmentsByInstructor = async (instructorId) => {
  try {
    console.log("🔄 Fetching assessments for instructor:", instructorId)

    const query = `
      SELECT 
        a.*,
        COUNT(ae.id) as enrolled_students,
        COUNT(qb.id) as question_blocks_count
      FROM assessments a
      LEFT JOIN assessment_enrollments ae ON a.id = ae.assessment_id
      LEFT JOIN question_blocks qb ON a.id = qb.assessment_id
      WHERE a.instructor_id = $1
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `

    const result = await pool.query(query, [instructorId])
    console.log("✅ Found assessments:", result.rows.length)
    return result.rows
  } catch (error) {
    console.error("Database error in getAssessmentsByInstructor:", error)
    throw new Error("Failed to fetch instructor assessments")
  }
}

/**
 * Finds an assessment by ID.
 * @param {number} assessmentId - The assessment ID
 * @returns {Promise<Object|null>} The assessment or null if not found
 */
export const getAssessmentById = async (assessmentId) => {
  try {
    // Get assessment details
    const assessmentQuery = `
      SELECT 
        a.*,
        u.name as instructor_name,
        COUNT(ae.id) as enrolled_students
      FROM assessments a
      JOIN users u ON a.instructor_id = u.id
      LEFT JOIN assessment_enrollments ae ON a.id = ae.assessment_id
      WHERE a.id = $1
      GROUP BY a.id, u.name
    `

    const assessmentResult = await pool.query(assessmentQuery, [assessmentId])

    if (assessmentResult.rows.length === 0) {
      return null
    }

    const assessment = assessmentResult.rows[0]

    // Get question blocks
    const blocksQuery = `
      SELECT * FROM question_blocks 
      WHERE assessment_id = $1 
      ORDER BY id
    `

    const blocksResult = await pool.query(blocksQuery, [assessmentId])
    assessment.question_blocks = blocksResult.rows

    return assessment
  } catch (error) {
    console.error("Database error in getAssessmentById:", error)
    throw new Error("Failed to fetch assessment")
  }
}

/**
 * Updates an assessment by ID.
 * @param {number} assessmentId - The assessment ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} The updated assessment
 */
export const updateAssessment = async (assessmentId, updateData) => {
  try {
    const {
      title,
      description,
      duration,
      total_marks,
      passing_marks,
      instructions,
      is_published,
      start_date,
      end_date,
    } = updateData

    const query = `
      UPDATE assessments 
      SET title = $1, description = $2, duration = $3, total_marks = $4, 
          passing_marks = $5, instructions = $6, is_published = $7, 
          start_date = $8, end_date = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `

    const result = await pool.query(query, [
      title,
      description,
      duration,
      total_marks,
      passing_marks,
      instructions,
      is_published,
      start_date,
      end_date,
      assessmentId,
    ])

    if (result.rows.length === 0) {
      return null
    }

    return await getAssessmentById(assessmentId)
  } catch (error) {
    console.error("Database error in updateAssessment:", error)
    throw new Error("Failed to update assessment")
  }
}

/**
 * Deletes an assessment by ID.
 * @param {number} assessmentId - The assessment ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteAssessment = async (assessmentId) => {
  try {
    const query = "DELETE FROM assessments WHERE id = $1 RETURNING *"
    const result = await pool.query(query, [assessmentId])

    return result.rows.length > 0
  } catch (error) {
    console.error("Database error in deleteAssessment:", error)
    throw new Error("Failed to delete assessment")
  }
}

/**
 * Enrolls a student in an assessment.
 * @param {number} assessmentId - The assessment ID
 * @param {string} studentId - The student's ID
 * @returns {Promise<Object>} The enrollment record
 */
export const enrollStudent = async (assessmentId, studentId) => {
  try {
    const query = `
      INSERT INTO assessment_enrollments (assessment_id, student_id)
      VALUES ($1, $2)
      ON CONFLICT (assessment_id, student_id) DO NOTHING
      RETURNING *
    `

    const result = await pool.query(query, [assessmentId, studentId])
    return result.rows[0]
  } catch (error) {
    console.error("Database error in enrollStudent:", error)
    throw new Error("Failed to enroll student")
  }
}

/**
 * Gets enrolled students for an assessment.
 * @param {number} assessmentId - The assessment ID
 * @returns {Promise<Array>} Array of enrolled students
 */
export const getEnrolledStudents = async (assessmentId) => {
  try {
    const query = `
      SELECT 
        u.id, u.name, u.email,
        ae.enrolled_at, ae.status, ae.score, ae.completed_at
      FROM assessment_enrollments ae
      JOIN users u ON ae.student_id = u.id
      WHERE ae.assessment_id = $1
      ORDER BY ae.enrolled_at DESC
    `

    const result = await pool.query(query, [assessmentId])
    return result.rows
  } catch (error) {
    console.error("Database error in getEnrolledStudents:", error)
    throw new Error("Failed to fetch enrolled students")
  }
}

/**
 * Gets assessments a student is enrolled in.
 * @param {number} studentId - The student's ID
 * @returns {Promise<Array>} Array of assessments
 */
export const getStudentAssessments = async (studentId) => {
  try {
    const query = `
      SELECT 
        a.*,
        u.name as instructor_name,
        ae.enrolled_at, ae.status, ae.score, ae.completed_at
      FROM assessment_enrollments ae
      JOIN assessments a ON ae.assessment_id = a.id
      JOIN users u ON a.instructor_id = u.id
      WHERE ae.student_id = $1
      ORDER BY ae.enrolled_at DESC
    `

    const result = await pool.query(query, [studentId])
    return result.rows
  } catch (error) {
    console.error("Database error in getStudentAssessments:", error)
    throw new Error("Failed to fetch student assessments")
  }
}

/**
 * Removes a student from an assessment.
 * @param {number} assessmentId - The assessment ID
 * @param {number} studentId - The student's ID
 * @returns {Promise<boolean>} Success status
 */
export const unenrollStudent = async (assessmentId, studentId) => {
  try {
    const query = `
      DELETE FROM assessment_enrollments 
      WHERE assessment_id = $1 AND student_id = $2
      RETURNING *
    `

    const result = await pool.query(query, [assessmentId, studentId])
    return result.rows.length > 0
  } catch (error) {
    console.error("Database error in unenrollStudent:", error)
    throw new Error("Failed to unenroll student")
  }
}

/**
 * Gets all assessments (admin only).
 * @returns {Promise<Array>} Array of all assessments
 */
export const getAllAssessments = async () => {
  try {
    const query = `
      SELECT 
        a.*,
        u.name as instructor_name,
        COUNT(ae.id) as enrolled_students
      FROM assessments a
      JOIN users u ON a.instructor_id = u.id
      LEFT JOIN assessment_enrollments ae ON a.id = ae.assessment_id
      GROUP BY a.id, u.name
      ORDER BY a.created_at DESC
    `

    const result = await pool.query(query)
    return result.rows
  } catch (error) {
    console.error("Database error in getAllAssessments:", error)
    throw new Error("Failed to fetch all assessments")
  }
}
