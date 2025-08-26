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
export const getAssessmentsByInstructor = async (instructor_id) => {
  const query = `
    SELECT 
      a.id,
      a.title,
      a.description,
      a.instructor_id,
      a.duration,
      a.total_marks,
      a.passing_marks,
      a.instructions,
      a.is_published,
      a.start_date,
      a.end_date,
      a.created_at,
      a.updated_at,
      (SELECT COUNT(*) FROM assessment_enrollments ae WHERE ae.assessment_id = a.id) AS enrolled_students,
      (SELECT COUNT(*) FROM question_blocks qb WHERE qb.assessment_id = a.id) AS question_blocks_count
    FROM assessments a
    WHERE a.instructor_id = $1
    ORDER BY a.created_at DESC
  `
  
  try {
  const result = await db.query(query, [instructor_id])
    console.log(`📊 Found ${result.rows.length} assessments for instructor ${instructor_id}`)
  return result.rows
  } catch (error) {
    console.error("❌ Error fetching instructor assessments:", error)
    throw error
  }
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
      latest_attempt.submitted_at,
      latest_attempt.time_taken,
      COALESCE(latest_attempt.total_score, 0) as total_score,
      COALESCE(latest_attempt.percentage, 0) as percentage,
      CASE 
        WHEN latest_attempt.status = 'submitted' OR latest_attempt.status = 'evaluated' THEN 'completed'
        WHEN a.end_date < NOW() THEN 'expired'
        WHEN a.start_date > NOW() THEN 'upcoming'
        ELSE 'pending'
      END as status
    FROM assessment_enrollments ae
    JOIN assessments a ON ae.assessment_id = a.id
    LEFT JOIN courses c ON a.course_id = c.id
    LEFT JOIN users u ON a.instructor_id = u.id
    LEFT JOIN LATERAL (
      SELECT * FROM assessment_attempts 
      WHERE assessment_id = a.id AND student_id = ae.student_id
      ORDER BY start_time DESC 
      LIMIT 1
    ) latest_attempt ON true
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
 * Create assessments table if it doesn't exist
 * @returns {boolean} Success
 */
export const ensureAssessmentsTable = async () => {
  try {
    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessments'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      console.log("Creating assessments table...")

      // Create assessments table (removed course_id concept)
      await db.query(`
        CREATE TABLE assessments (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          duration INTEGER DEFAULT 60,
          total_marks INTEGER DEFAULT 100,
          passing_marks INTEGER DEFAULT 50,
          max_attempts INTEGER DEFAULT 1,
          instructions TEXT,
          is_published BOOLEAN DEFAULT FALSE,
          start_date TIMESTAMP WITH TIME ZONE,
          end_date TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes (removed course_id index)
      await db.query(`
        CREATE INDEX idx_assessments_instructor_id ON assessments(instructor_id);
        CREATE INDEX idx_assessments_created_at ON assessments(created_at);
      `)

      console.log("✅ assessments table created successfully")
    } else {
      console.log("✅ assessments table already exists")
    }

    // Check if assessment_enrollments table exists
    const enrollmentsCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_enrollments'
      )
    `)

    if (!enrollmentsCheck.rows[0].exists) {
      console.log("Creating assessment_enrollments table...")

      // Create assessment_enrollments table
      await db.query(`
        CREATE TABLE assessment_enrollments (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(assessment_id, student_id)
        )
      `)

      // Create indexes
      await db.query(`
        CREATE INDEX idx_assessment_enrollments_assessment_id ON assessment_enrollments(assessment_id);
        CREATE INDEX idx_assessment_enrollments_student_id ON assessment_enrollments(student_id);
      `)

      console.log("✅ assessment_enrollments table created successfully")
    } else {
      console.log("✅ assessment_enrollments table already exists")
    }

    // Check if question_blocks table exists
    const questionBlocksCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'question_blocks'
      )
    `)

    if (!questionBlocksCheck.rows[0].exists) {
      console.log("Creating question_blocks table...")

      // Create question_blocks table to store question block configurations
      await db.query(`
        CREATE TABLE question_blocks (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          block_title VARCHAR(255) NOT NULL,
          block_description TEXT,
          question_count INTEGER NOT NULL DEFAULT 1,
          marks_per_question INTEGER NOT NULL DEFAULT 1,
          difficulty_level VARCHAR(20) DEFAULT 'medium',
          question_type VARCHAR(50) DEFAULT 'multiple_choice',
          topics TEXT[], -- Array of topics
          block_order INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes
      await db.query(`
        CREATE INDEX idx_question_blocks_assessment_id ON question_blocks(assessment_id);
        CREATE INDEX idx_question_blocks_order ON question_blocks(block_order);
      `)

      console.log("✅ question_blocks table created successfully")
    } else {
      console.log("✅ question_blocks table already exists - checking for missing columns...")
      
      // Check if block_order column exists, if not add it
      const columnCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'question_blocks' 
          AND column_name = 'block_order'
        )
      `)
      
      if (!columnCheck.rows[0].exists) {
        console.log("Adding missing block_order column to question_blocks table...")
        await db.query(`
          ALTER TABLE question_blocks 
          ADD COLUMN block_order INTEGER NOT NULL DEFAULT 1
        `)
        
        // Create index for the new column
        await db.query(`
          CREATE INDEX IF NOT EXISTS idx_question_blocks_order ON question_blocks(block_order)
        `)
        
        console.log("✅ block_order column added successfully")
      } else {
        console.log("✅ block_order column already exists")
      }
      
      // Check if topics column exists, if not add it
      const topicsCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'question_blocks' 
          AND column_name = 'topics'
        )
      `)
      
      if (!topicsCheck.rows[0].exists) {
        console.log("Adding missing topics column to question_blocks table...")
        await db.query(`
          ALTER TABLE question_blocks 
          ADD COLUMN topics TEXT[] DEFAULT '{}'
        `)
        console.log("✅ topics column added successfully")
      } else {
        console.log("✅ topics column already exists")
      }
    }

    // Ensure assessment attempts table exists
    await ensureAssessmentAttemptsTable()

    // Check if ai_generation_audit_logs table exists
    const auditLogsCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_generation_audit_logs'
      )
    `)

    if (!auditLogsCheck.rows[0].exists) {
      console.log("Creating ai_generation_audit_logs table...")

      // Create ai_generation_audit_logs table
      await db.query(`
        CREATE TABLE ai_generation_audit_logs (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(100) NOT NULL,
          block_title VARCHAR(255),
          question_count INTEGER,
          question_type VARCHAR(50),
          difficulty_level VARCHAR(20),
          topics TEXT[],
          status VARCHAR(20) DEFAULT 'in_progress',
          questions_generated INTEGER,
          ai_response TEXT,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes
      await db.query(`
        CREATE INDEX idx_ai_audit_assessment_id ON ai_generation_audit_logs(assessment_id);
        CREATE INDEX idx_ai_audit_instructor_id ON ai_generation_audit_logs(instructor_id);
        CREATE INDEX idx_ai_audit_created_at ON ai_generation_audit_logs(created_at);
      `)

      console.log("✅ ai_generation_audit_logs table created successfully")
    }

    // Create question_bank table if it doesn't exist
    const questionBankCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'question_bank'
      )
    `)

    if (!questionBankCheck.rows[0].exists) {
      console.log("Creating question_bank table...")
      await db.query(`
        CREATE TABLE question_bank (
          id SERIAL PRIMARY KEY,
          instructor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL,
          question_type VARCHAR(50) NOT NULL,
          difficulty_level VARCHAR(50) DEFAULT 'medium',
          topics TEXT[],
          options JSONB,
          correct_answer TEXT,
          explanation TEXT,
          marks_per_question INTEGER DEFAULT 1,
          tags TEXT[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `)
      await db.query(`
        CREATE INDEX idx_question_bank_instructor ON question_bank(instructor_id);
        CREATE INDEX idx_question_bank_type ON question_bank(question_type);
        CREATE INDEX idx_question_bank_difficulty ON question_bank(difficulty_level);
        CREATE INDEX idx_question_bank_topics ON question_bank USING GIN(topics);
        CREATE INDEX idx_question_bank_tags ON question_bank USING GIN(tags);
      `)
      console.log("✅ question_bank table created successfully")
    } else {
      console.log("✅ question_bank table already exists")
    }

    // Create question_assignments table if it doesn't exist
    const questionAssignmentsCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'question_assignments'
      )
    `)

    if (!questionAssignmentsCheck.rows[0].exists) {
      console.log("Creating question_assignments table...")
      await db.query(`
        CREATE TABLE question_assignments (
          id SERIAL PRIMARY KEY,
          question_bank_id INTEGER REFERENCES question_bank(id) ON DELETE CASCADE,
          assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
          assigned_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(question_bank_id, assessment_id)
        )
      `)
      await db.query(`
        CREATE INDEX idx_question_assignments_bank ON question_assignments(question_bank_id);
        CREATE INDEX idx_question_assignments_assessment ON question_assignments(assessment_id);
      `)
      console.log("✅ question_assignments table created successfully")
    } else {
      console.log("✅ question_assignments table already exists")
    }

    // Check if questions table exists
    const questionsCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questions'
      )
    `)

    if (!questionsCheck.rows[0].exists) {
      console.log("Creating questions table...")

      // Create questions table
      await db.query(`
        CREATE TABLE questions (
          id SERIAL PRIMARY KEY,
          assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
          question_number INTEGER NOT NULL,
          question_text TEXT NOT NULL,
          question_type VARCHAR(50) NOT NULL,
          options TEXT[],
          correct_answer TEXT,
          expected_answer TEXT,
          rubric JSONB,
          marks INTEGER NOT NULL DEFAULT 1,
          difficulty_level VARCHAR(20) DEFAULT 'medium',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      console.log("✅ questions table created successfully")
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
          question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          answer_text TEXT,
          selected_options TEXT[],
          scored_marks INTEGER DEFAULT 0,
          grading_method VARCHAR(50) DEFAULT 'pending',
          feedback TEXT,
          grading_notes TEXT,
          graded_at TIMESTAMP WITH TIME ZONE,
          overridden_by INTEGER REFERENCES users(id),
          overridden_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      console.log("✅ student_answers table created successfully")
    }

    return true
  } catch (error) {
    console.error("❌ Error creating assessments tables:", error)
    throw error
  }
}

/**
 * Store question blocks for an assessment
 * @param {number} assessmentId - Assessment ID
 * @param {Array} questionBlocks - Array of question block objects
 * @param {number} instructorId - Instructor ID
 * @returns {boolean} Success
 */
export const storeQuestionBlocks = async (assessmentId, questionBlocks, instructorId) => {
  try {
    console.log(`📝 Storing ${questionBlocks.length} question blocks for assessment ${assessmentId}`)
    
    // Ensure generated_questions table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS generated_questions (
        id SERIAL PRIMARY KEY,
        block_id INTEGER NOT NULL REFERENCES question_blocks(id) ON DELETE CASCADE,
        question_order INTEGER NOT NULL DEFAULT 1,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL,
        options JSONB,
        correct_answer JSONB,
        explanation TEXT,
        marks INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Delete existing question blocks and their generated questions (cascade via FK)
    await db.query("DELETE FROM question_blocks WHERE assessment_id = $1", [assessmentId])
    
    let totalQuestions = 0

    // Insert new question blocks (and nested questions if provided)
    for (let i = 0; i < questionBlocks.length; i++) {
      const block = questionBlocks[i]
      const insertBlockQuery = `
        INSERT INTO question_blocks (
          assessment_id, block_title, block_description, question_count, 
          marks_per_question, difficulty_level, question_type, topics, block_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `
      
      const blockValues = [
        assessmentId,
        block.block_title,
        block.block_description || null,
        block.question_count || (Array.isArray(block.questions) ? block.questions.length : 1),
        block.marks_per_question || 1,
        block.difficulty_level || 'medium',
        block.question_type || 'multiple_choice',
        block.topics || [],
        i + 1
      ]
      
      const insertedBlock = await db.query(insertBlockQuery, blockValues)
      const blockId = insertedBlock.rows[0].id

      // If questions provided in payload, persist them to generated_questions
      if (Array.isArray(block.questions) && block.questions.length > 0) {
        for (let qIndex = 0; qIndex < block.questions.length; qIndex++) {
          const q = block.questions[qIndex]
          const insertQuestionQuery = `
            INSERT INTO generated_questions (
              block_id, question_order, question_text, question_type, options, correct_answer, explanation, marks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `

          const questionOptions = q.options ? JSON.stringify(q.options) : null
          const correctAnswer = q.correct_answer !== undefined ? JSON.stringify(q.correct_answer) : null

          const insertQuestionValues = [
            blockId,
            q.question_order || qIndex + 1,
            q.question_text || q.question || "",
            q.question_type || q.type || 'multiple_choice',
            questionOptions,
            correctAnswer,
            q.explanation || null,
            q.marks || block.marks_per_question || 1
          ]

          await db.query(insertQuestionQuery, insertQuestionValues)
          totalQuestions++
        }
      }
    }
    
    console.log(`✅ Successfully stored ${questionBlocks.length} blocks and ${totalQuestions} questions`)
    return { blocks: questionBlocks.length, questions: totalQuestions }
  } catch (error) {
    console.error("❌ Error storing question blocks:", error)
    throw error
  }
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
          start_time TIMESTAMP NOT NULL DEFAULT NOW(),
          time_limit INTEGER NOT NULL DEFAULT 3600, -- in seconds
          status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, submitted, expired
          current_question INTEGER DEFAULT 1,
          last_saved TIMESTAMP,
          submitted_at TIMESTAMP,
          time_taken INTEGER, -- in seconds
          grade INTEGER, -- numerical grade
          percentage DECIMAL(5,2), -- percentage score
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
    } else {
      console.log("✅ assessment_attempts table already exists - checking for missing columns...")
      
      // Check if submitted_at column exists, if not add it
      const submittedAtCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'assessment_attempts' 
          AND column_name = 'submitted_at'
        )
      `)
      
      if (!submittedAtCheck.rows[0].exists) {
        console.log("Adding missing submitted_at column to assessment_attempts table...")
        await db.query(`
          ALTER TABLE assessment_attempts 
          ADD COLUMN submitted_at TIMESTAMP
        `)
        console.log("✅ submitted_at column added successfully")
      } else {
        console.log("✅ submitted_at column already exists")
      }
      
      // Check if grade column exists, if not add it
      const gradeCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'assessment_attempts' 
          AND column_name = 'grade'
        )
      `)
      
      if (!gradeCheck.rows[0].exists) {
        console.log("Adding missing grade column to assessment_attempts table...")
        await db.query(`
          ALTER TABLE assessment_attempts 
          ADD COLUMN grade INTEGER
        `)
        console.log("✅ grade column added successfully")
      } else {
        console.log("✅ grade column already exists")
      }
      
      // Check if percentage column exists, if not add it
      const percentageCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'assessment_attempts' 
          AND column_name = 'percentage'
        )
      `)
      
      if (!percentageCheck.rows[0].exists) {
        console.log("Adding missing percentage column to assessment_attempts table...")
        await db.query(`
          ALTER TABLE assessment_attempts 
          ADD COLUMN percentage DECIMAL(5,2)
        `)
        console.log("✅ percentage column added successfully")
      } else {
        console.log("✅ percentage column already exists")
      }
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
          question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
          answer_text TEXT,
          selected_options TEXT[],
          scored_marks INTEGER DEFAULT 0,
          grading_method VARCHAR(50) DEFAULT 'pending',
          feedback TEXT,
          grading_notes TEXT,
          graded_at TIMESTAMP WITH TIME ZONE,
          overridden_by INTEGER REFERENCES users(id),
          overridden_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      console.log("✅ student_answers table created successfully")
    }

    return true
  } catch (error) {
    console.error("❌ Error creating assessment attempts tables:", error)
    throw error
  }
}
