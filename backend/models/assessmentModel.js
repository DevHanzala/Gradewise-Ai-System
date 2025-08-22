import db from "../DB/db.js"

/**
 * Create a new assessment
 * @param {Object} assessmentData - Assessment data
 * @returns {Object} Created assessment
 */
export const createAssessment = async (assessmentData) => {
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
    course_id,
  } = assessmentData

  const query = `
    INSERT INTO assessments (
      title, description, instructor_id, duration, total_marks, passing_marks,
      instructions, is_published, start_date, end_date, course_id, created_at, updated_at
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    RETURNING *
  `

  const values = [
    title,
    description || null,
    instructor_id,
    duration || 60,
    total_marks || 100,
    passing_marks || 50,
    instructions || null,
    is_published ?? false,
    start_date || null,
    end_date || null,
    course_id || null,
  ]

  const result = await db.query(query, values)
  return result.rows[0]
}


/**
 * Get assessment by ID
 * @param {number} id - Assessment ID
 * @param {number} user_id - User ID
 * @param {string} user_role - User role
 * @returns {Object} Assessment
 */
export const getAssessmentById = async (id, user_id = null, user_role = null) => {
  const query = `
    SELECT 
      a.*,
      u.name as instructor_name,
      u.email as instructor_email,
      (SELECT COUNT(*) FROM assessment_enrollments ae WHERE ae.assessment_id = a.id) AS enrolled_students,
      (SELECT COUNT(*) FROM questions q WHERE q.assessment_id = a.id) AS question_count
    FROM assessments a
    LEFT JOIN users u ON a.instructor_id = u.id
    WHERE a.id = $1
  `

  const result = await db.query(query, [id])

  if (result.rows.length === 0) {
    return null
  }

  const assessment = result.rows[0]

  // Check permissions
  if (user_role === "instructor" && assessment.instructor_id !== Number.parseInt(user_id)) {
    return null
  }

  // Parse JSON fields
  if (assessment.settings) {
    assessment.settings = JSON.parse(assessment.settings)
  }

  return assessment
}

/**
 * Update assessment
 * @param {number} id - Assessment ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated assessment
 */
export const updateAssessment = async (id, updateData) => {
  const allowedFields = [
    "title",
    "description",
    "course_id",
    "course_title",
    "end_date",
    "time_limit",
    "passing_score",
    "settings",
    "status",
  ]

  const updates = []
  const values = []
  let paramCounter = 1

  // Add each field that exists in updateData
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updates.push(`${field} = $${paramCounter}`)
      values.push(updateData[field])
      paramCounter++
    }
  }

  // Add updated_at timestamp
  updates.push(`updated_at = NOW()`)

  // If no fields to update, return the current assessment
  if (updates.length === 1) {
    return await getAssessmentById(id)
  }

  // Build and execute query
  const query = `
    UPDATE assessments
    SET ${updates.join(", ")}
    WHERE id = $${paramCounter}
    RETURNING *
  `

  values.push(id)

  const result = await db.query(query, values)
  const assessment = result.rows[0]

  // Parse JSON fields
  if (assessment && assessment.settings) {
    assessment.settings = JSON.parse(assessment.settings)
  }

  return assessment
}

/**
 * Delete assessment
 * @param {number} id - Assessment ID
 * @returns {boolean} Success
 */
export const deleteAssessment = async (id) => {
  // First delete related records
  await db.query("DELETE FROM assessment_enrollments WHERE assessment_id = $1", [id])
  await db.query("DELETE FROM assessment_attempts WHERE assessment_id = $1", [id])
  await db.query("DELETE FROM questions WHERE assessment_id = $1", [id])

  // Then delete the assessment
  const result = await db.query("DELETE FROM assessments WHERE id = $1", [id])

  return result.rowCount > 0
}

/**
 * Get assessments by instructor
 * @param {number} instructor_id - Instructor ID
 * @returns {Array} List of assessments
 */
// assessmentModel.js
export const getAssessmentsByInstructor = async (instructor_id) => {
  const query = `
    SELECT 
      id,
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
      created_at,
      updated_at,
      course_id
    FROM assessments
    WHERE instructor_id = $1
    ORDER BY created_at DESC
  `
  const result = await db.query(query, [instructor_id])
  return result.rows
}


/**
 * Get all assessments (admin only)
 * @returns {Array} List of all assessments
 */
export const getAllAssessments = async () => {
  const query = `
    SELECT 
      a.*,
      u.name AS instructor_name,
      u.email AS instructor_email,
      (SELECT COUNT(*) FROM assessment_enrollments ae WHERE ae.assessment_id = a.id) AS enrolled_students,
      (SELECT COUNT(*) FROM questions q WHERE q.assessment_id = a.id) AS question_count
    FROM assessments a
    LEFT JOIN users u ON a.instructor_id = u.id
    ORDER BY a.created_at DESC
  `

  const result = await db.query(query)

  // Parse JSON fields
  return result.rows.map((assessment) => {
    if (assessment.settings) {
      assessment.settings = JSON.parse(assessment.settings)
    }
    return assessment
  })
}

/**
 * Enroll student in assessment
 * @param {number} assessment_id - Assessment ID
 * @param {number} student_id - Student ID
 * @returns {boolean} Success
 */
export const enrollStudent = async (assessment_id, student_id) => {
  const query = `
    INSERT INTO assessment_enrollments (assessment_id, student_id, enrolled_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (assessment_id, student_id) DO NOTHING
    RETURNING *
  `

  const result = await db.query(query, [assessment_id, student_id])
  return result.rows.length > 0
}

/**
 * Enroll multiple students in assessment
 */
export const enrollMultipleStudentsDb = async (assessment_id, student_ids) => {
  if (!student_ids || student_ids.length === 0) {
    return []
  }

  const values = []
  const placeholders = []

  student_ids.forEach((student_id, index) => {
    const baseIndex = index * 2
    placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, NOW())`)
    values.push(assessment_id, student_id)
  })

  const query = `
    INSERT INTO assessment_enrollments (assessment_id, student_id, enrolled_at)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (assessment_id, student_id) DO NOTHING
    RETURNING *
  `

  const result = await db.query(query, values)
  return result.rows
}

/**
 * Get enrolled students for assessment
 * @param {number} assessmentId - Assessment ID
 * @returns {Array} List of enrolled students
 */

export const getEnrolledStudents = async (assessmentId) => {
  const query = `
    SELECT 
      u.id, 
      u.email, 
      u.name,
      ae.enrolled_at,
      -- total attempts
      COALESCE(
        (
          SELECT COUNT(*) 
          FROM assessment_attempts aa 
          WHERE aa.assessment_id = ae.assessment_id AND aa.student_id = u.id
        ), 0
      ) AS attempt_count,
      -- last attempt date
      (
        SELECT MAX(aa.submitted_at) 
        FROM assessment_attempts aa 
        WHERE aa.assessment_id = ae.assessment_id AND aa.student_id = u.id
      ) AS last_attempt_date,
      -- last attempt percentage
      COALESCE(
        (
          SELECT aa.percentage
          FROM assessment_attempts aa 
          WHERE aa.assessment_id = ae.assessment_id AND aa.student_id = u.id
          ORDER BY aa.submitted_at DESC
          LIMIT 1
        ), 0
      ) AS last_score
    FROM assessment_enrollments ae
    JOIN users u ON ae.student_id = u.id
    WHERE ae.assessment_id = $1
    ORDER BY u.name
  `

  const result = await db.query(query, [assessmentId])
  return result.rows
}

/**
 * Remove student enrollment from assessment
 * @param {number} assessmentId - Assessment ID
 * @param {number} studentId - Student ID
 * @returns {boolean} Success
 */
export const removeStudentEnrollment = async (assessmentId, studentId) => {
  // Delete attempts first
  await db.query("DELETE FROM assessment_attempts WHERE assessment_id = $1 AND student_id = $2", [
    assessmentId,
    studentId,
  ])

  // Then delete enrollment
  const result = await db.query("DELETE FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2", [
    assessmentId,
    studentId,
  ])

  return result.rowCount > 0
}

/**
 * Get student's assessments
 * @param {number} student_id - Student ID
 * @returns {Array} List of assessments
 */
export const getStudentAssessments = async (student_id) => {
  const query = `
    SELECT 
      a.id,
      a.title,
      a.description,
      a.start_date,
      a.end_date,
      a.duration,
      a.total_marks,
      c.title AS course_title,
      u.name AS instructor_name,
      ae.enrolled_at,
      (SELECT COUNT(*) FROM questions WHERE assessment_id = a.id) AS question_count,
      aa.submitted_at,
      aa.time_taken,
      COALESCE(aa.total_score, 0) as total_score,
      COALESCE(aa.percentage, 0) as percentage,
      CASE 
        WHEN aa.status = 'submitted' OR aa.status = 'evaluated' THEN 'completed'
        WHEN a.end_date < NOW() THEN 'expired'
        WHEN a.start_date > NOW() THEN 'upcoming'
        ELSE 'pending'
      END as status
    FROM assessment_enrollments ae
    JOIN assessments a ON ae.assessment_id = a.id
    LEFT JOIN courses c ON a.course_id = c.id
    LEFT JOIN users u ON a.instructor_id = u.id
    LEFT JOIN assessment_attempts aa 
      ON a.id = aa.assessment_id 
     AND ae.student_id = aa.student_id
    WHERE ae.student_id = $1
    ORDER BY a.end_date ASC, a.created_at DESC
  `

  const result = await db.query(query, [student_id])
  return result.rows
}


/**
 * Submit student attempt
 * @param {number} assessment_id - Assessment ID
 * @param {number} student_id - Student ID
 * @param {Array} answers - Array of answer objects
 * @param {number} time_taken - Time taken in seconds
 * @returns {Object} Submitted attempt with score percentage
 */
export const submitStudentAttempt = async (assessment_id, student_id, answers, time_taken) => {
  // Get questions for this assessment
  const questionsQuery = "SELECT id, correct_answer FROM questions WHERE assessment_id = $1"
  const questionsResult = await db.query(questionsQuery, [assessment_id])
  const questions = questionsResult.rows

  // Calculate score
  let correct_answers = 0
  const total_questions = questions.length

  // Check each answer
  answers.forEach((answer) => {
    const question = questions.find((q) => q.id === Number.parseInt(answer.question_id))
    if (question && question.correct_answer === answer.selected_answer) {
      correct_answers++
    }
  })

  // Insert attempt
  const attemptQuery = `
    INSERT INTO assessment_attempts (
      assessment_id, student_id, correct_answers, total_questions, time_taken, created_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `

  const attemptValues = [assessment_id, student_id, correct_answers, total_questions, time_taken]
  const attemptResult = await db.query(attemptQuery, attemptValues)
  const attempt = attemptResult.rows[0]

  // Calculate percentage
  const score_percentage = total_questions > 0 ? Math.round((correct_answers / total_questions) * 100 * 100) / 100 : 0

  return {
    ...attempt,
    score_percentage,
  }
}

/**
 * Get student attempts for assessment
 * @param {number} assessment_id - Assessment ID
 * @param {number} user_id - User ID
 * @param {string} user_role - User role
 * @returns {Array} List of student attempts
 */
export const getStudentAttempts = async (assessment_id, user_id, user_role) => {
  let query = `
    SELECT 
      aa.*,
      CASE 
        WHEN aa.total_questions > 0 
        THEN ROUND((aa.correct_answers::float / aa.total_questions) * 100, 1)
        ELSE 0
      END AS score_percentage
    FROM assessment_attempts aa
    WHERE aa.assessment_id = $1
  `

  const values = [assessment_id]

  if (user_role === "student") {
    query += " AND aa.student_id = $2"
    values.push(user_id)
  } else if (user_role === "instructor") {
    // Add instructor check
    query += ` AND EXISTS (
      SELECT 1 FROM assessments a 
      WHERE a.id = aa.assessment_id AND a.instructor_id = $2
    )`
    values.push(user_id)
  }

  query += " ORDER BY aa.created_at DESC"

  const result = await db.query(query, values)
  return result.rows
}

/**
 * Get assessment statistics
 * @param {number} assessment_id - Assessment ID
 * @returns {Object} Assessment statistics
 */
export const getAssessmentStatistics = async (assessment_id) => {
  // Get basic stats
  const basicStatsQuery = `
    SELECT
      COUNT(DISTINCT ae.student_id) AS total_enrolled,
      COUNT(DISTINCT aa.student_id) AS total_attempted,
      COALESCE(AVG(CASE WHEN aa.total_questions > 0 THEN (aa.correct_answers::float / aa.total_questions) * 100 ELSE 0 END), 0) AS average_score,
      COALESCE(MIN(CASE WHEN aa.total_questions > 0 THEN (aa.correct_answers::float / aa.total_questions) * 100 ELSE 0 END), 0) AS min_score,
      COALESCE(MAX(CASE WHEN aa.total_questions > 0 THEN (aa.correct_answers::float / aa.total_questions) * 100 ELSE 0 END), 0) AS max_score,
      COALESCE(AVG(aa.time_taken), 0) AS average_time,
      COUNT(aa.id) AS total_attempts
    FROM assessments a
    LEFT JOIN assessment_enrollments ae ON a.id = ae.assessment_id
    LEFT JOIN assessment_attempts aa ON a.id = aa.assessment_id
    WHERE a.id = $1
    GROUP BY a.id
  `

  const basicStatsResult = await db.query(basicStatsQuery, [assessment_id])
  const basicStats = basicStatsResult.rows[0] || {
    total_enrolled: 0,
    total_attempted: 0,
    average_score: 0,
    min_score: 0,
    max_score: 0,
    average_time: 0,
    total_attempts: 0,
  }

  // Get score distribution
  const scoreDistributionQuery = `
    SELECT
      CASE
        WHEN score_range = 0 THEN '0-9%'
        WHEN score_range = 1 THEN '10-19%'
        WHEN score_range = 2 THEN '20-29%'
        WHEN score_range = 3 THEN '30-39%'
        WHEN score_range = 4 THEN '40-49%'
        WHEN score_range = 5 THEN '50-59%'
        WHEN score_range = 6 THEN '60-69%'
        WHEN score_range = 7 THEN '70-79%'
        WHEN score_range = 8 THEN '80-89%'
        WHEN score_range = 9 THEN '90-100%'
      END AS range,
      COUNT(*) AS count
    FROM (
      SELECT
        FLOOR((CASE WHEN aa.total_questions > 0 THEN (aa.correct_answers::float / aa.total_questions) * 100 ELSE 0 END) / 10) AS score_range
      FROM assessment_attempts aa
      WHERE aa.assessment_id = $1
    ) AS score_ranges
    GROUP BY score_range
    ORDER BY score_range
  `

  const scoreDistributionResult = await db.query(scoreDistributionQuery, [assessment_id])
  const scoreDistribution = scoreDistributionResult.rows

  return {
    basic: {
      totalEnrolled: Number.parseInt(basicStats.total_enrolled) || 0,
      totalAttempted: Number.parseInt(basicStats.total_attempted) || 0,
      averageScore: Number.parseFloat(basicStats.average_score) || 0,
      minScore: Number.parseFloat(basicStats.min_score) || 0,
      maxScore: Number.parseFloat(basicStats.max_score) || 0,
      averageTime: Number.parseFloat(basicStats.average_time) || 0,
      totalAttempts: Number.parseInt(basicStats.total_attempts) || 0,
    },
    scoreDistribution,
  }
}

/**
 * Check if student is enrolled in assessment
 * @param {number} assessmentId - Assessment ID
 * @param {number} studentId - Student ID
 * @returns {boolean} Is enrolled
 */
export const isStudentEnrolled = async (assessmentId, studentId) => {
  const query = `
    SELECT 1
    FROM assessment_enrollments
    WHERE assessment_id = $1 AND student_id = $2
  `

  const result = await db.query(query, [assessmentId, studentId])
  return result.rows.length > 0
}

/**
 * Get questions for assessment
 * @param {number} assessmentId - Assessment ID
 * @returns {Array} List of questions
 */
export const getAssessmentQuestions = async (assessmentId) => {
  const query = `
    SELECT *
    FROM questions
    WHERE assessment_id = $1
    ORDER BY display_order ASC, id ASC
  `

  const result = await db.query(query, [assessmentId])

  // Parse JSON fields
  return result.rows.map((question) => {
    if (question.options) {
      question.options = JSON.parse(question.options)
    }
    if (question.correct_answer) {
      question.correct_answer = JSON.parse(question.correct_answer)
    }
    if (question.tags) {
      question.tags = JSON.parse(question.tags)
    }
    return question
  })
}

/**
 * Create assessment_attempts table if it doesn't exist
 * @returns {boolean} Success
 */
export const ensureAssessmentAttemptsTable = async () => {
  try {
    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_attempts'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessment_attempts table...")

      // Create assessment_attempts table
      await db.query(`
        CREATE TABLE assessment_attempts (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          correct_answers INTEGER NOT NULL DEFAULT 0,
          total_questions INTEGER NOT NULL DEFAULT 0,
          time_taken INTEGER, -- in seconds
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(assessment_id, student_id)
        )
      `)

      // Create indexes
      await db.query(`
        CREATE INDEX idx_assessment_attempts_assessment_id ON assessment_attempts(assessment_id);
        CREATE INDEX idx_assessment_attempts_student_id ON assessment_attempts(student_id);
      `)

      console.log("✅ assessment_attempts table created successfully")
    }

    // Check if student_answers table exists
    const studentAnswersCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_answers'
      )
    `)

    if (!studentAnswersCheck.rows[0].exists) {
      console.log("Creating student_answers table...")

      // Create student_answers table
      await db.query(`
        CREATE TABLE student_answers (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
          question_id INTEGER NOT NULL,
          user_answer TEXT,
          is_correct BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `)

      // Create indexes
      await db.query(`
        CREATE INDEX idx_student_answers_attempt_id ON student_answers(attempt_id);
        CREATE INDEX idx_student_answers_question_id ON student_answers(question_id);
      `)

      console.log("✅ student_answers table created successfully")
    }

    return true
  } catch (error) {
    console.error("❌ Error creating assessment attempts tables:", error)
    throw error
  }
}
