import pool from "../DB/db.js"

/**
 * Gets admin dashboard overview statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getAdminOverview = async (req, res) => {
  try {
    console.log(`🔄 Fetching admin overview statistics`)

    // Get total users count by role
    const usersQuery = `
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `
    const { rows: userStats } = await pool.query(usersQuery)

    // Get total assessments count
    const assessmentsQuery = `SELECT COUNT(*) as count FROM assessments`
    const { rows: assessmentStats } = await pool.query(assessmentsQuery)

    // Get total assessment enrollments count
    const enrollmentsQuery = `SELECT COUNT(*) as count FROM assessment_enrollments`
    const { rows: enrollmentStats } = await pool.query(enrollmentsQuery)

    // Get total question blocks count
    const questionBlocksQuery = `SELECT COUNT(*) as count FROM question_blocks`
    const { rows: questionBlockStats } = await pool.query(questionBlocksQuery)

    // Get total assessment attempts count
    const attemptsQuery = `SELECT COUNT(*) as count FROM assessment_attempts`
    const { rows: attemptStats } = await pool.query(attemptsQuery)

    // Get recent activity (last 10 assessment enrollments)
    const recentActivityQuery = `
      SELECT ae.enrolled_at, u.name as student_name, a.title as assessment_title
      FROM assessment_enrollments ae
      JOIN users u ON ae.student_id = u.id
      JOIN assessments a ON ae.assessment_id = a.id
      ORDER BY ae.enrolled_at DESC
      LIMIT 10
    `
    const { rows: recentActivity } = await pool.query(recentActivityQuery)

    // Format user statistics
    const usersByRole = userStats.reduce(
      (acc, stat) => {
        acc[stat.role] = Number.parseInt(stat.count)
        return acc
      },
      { admin: 0, instructor: 0, student: 0 },
    )

    const overview = {
      users: {
        total: usersByRole.admin + usersByRole.instructor + usersByRole.student,
        admin: usersByRole.admin,
        instructor: usersByRole.instructor,
        student: usersByRole.student,
      },
      assessments: Number.parseInt(assessmentStats[0].count),
      enrollments: Number.parseInt(enrollmentStats[0].count),
      questionBlocks: Number.parseInt(questionBlockStats[0].count),
      attempts: Number.parseInt(attemptStats[0].count),
      recentActivity,
    }

    console.log(`✅ Admin overview statistics fetched successfully`)

    res.status(200).json({
      overview,
    })
  } catch (error) {
    console.error("❌ Get admin overview error:", error)
    res.status(500).json({ message: "Server error while fetching admin overview." })
  }
}

/**
 * Gets instructor dashboard overview statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getInstructorOverview = async (req, res) => {
  const instructorId = req.user.id

  try {
    console.log(`🔄 Fetching instructor overview for ${instructorId}`)

    // Get instructor's assessments count
    const assessmentsQuery = `
      SELECT COUNT(*) as count FROM assessments WHERE instructor_id = $1
    `
    const { rows: assessmentStats } = await pool.query(assessmentsQuery, [instructorId])

    // Get total students enrolled in instructor's assessments
    const studentsQuery = `
      SELECT COUNT(DISTINCT ae.student_id) as count
      FROM assessment_enrollments ae
      JOIN assessments a ON ae.assessment_id = a.id
      WHERE a.instructor_id = $1
    `
    const { rows: studentStats } = await pool.query(studentsQuery, [instructorId])

    // Get instructor's question blocks count
    const questionBlocksQuery = `
      SELECT COUNT(*) as count 
      FROM question_blocks qb
      JOIN assessments a ON qb.assessment_id = a.id
      WHERE a.instructor_id = $1
    `
    const { rows: questionBlockStats } = await pool.query(questionBlocksQuery, [instructorId])

    // Get total attempts for instructor's assessments
    const attemptsQuery = `
      SELECT COUNT(*) as count
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE a.instructor_id = $1
    `
    const { rows: attemptStats } = await pool.query(attemptsQuery, [instructorId])

    // Get pending attempts (not graded yet)
    const pendingAttemptsQuery = `
      SELECT COUNT(*) as count
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE a.instructor_id = $1 AND aa.grade IS NULL
    `
    const { rows: pendingStats } = await pool.query(pendingAttemptsQuery, [instructorId])

    // Get recent enrollments for instructor's assessments
    const recentEnrollmentsQuery = `
      SELECT ae.enrolled_at, u.name as student_name, a.title as assessment_title
      FROM assessment_enrollments ae
      JOIN users u ON ae.student_id = u.id
      JOIN assessments a ON ae.assessment_id = a.id
      WHERE a.instructor_id = $1
      ORDER BY ae.enrolled_at DESC
      LIMIT 10
    `
    const { rows: recentEnrollments } = await pool.query(recentEnrollmentsQuery, [instructorId])

    const overview = {
      assessments: Number.parseInt(assessmentStats[0].count),
      students: Number.parseInt(studentStats[0].count),
      questionBlocks: Number.parseInt(questionBlockStats[0].count),
      totalAttempts: Number.parseInt(attemptStats[0].count),
      pendingGrades: Number.parseInt(pendingStats[0].count),
      recentEnrollments,
    }

    console.log(`✅ Instructor overview statistics fetched successfully`)

    res.status(200).json({
      overview,
    })
  } catch (error) {
    console.error("❌ Get instructor overview error:", error)
    res.status(500).json({ message: "Server error while fetching instructor overview." })
  }
}

/**
 * Gets student dashboard overview statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getStudentOverview = async (req, res) => {
  const studentId = req.user.id

  try {
    console.log(`🔄 Fetching student overview for ${studentId}`)

    // Get student's enrolled assessments count
    const assessmentsQuery = `
      SELECT COUNT(*) as count FROM assessment_enrollments WHERE student_id = $1
    `
    const { rows: assessmentStats } = await pool.query(assessmentsQuery, [studentId])

    // Get total question blocks for student's enrolled assessments
    const questionBlocksQuery = `
      SELECT COUNT(*) as count
      FROM question_blocks qb
      JOIN assessment_enrollments ae ON qb.assessment_id = ae.assessment_id
      WHERE ae.student_id = $1
    `
    const { rows: questionBlockStats } = await pool.query(questionBlocksQuery, [studentId])

    // Get student's assessment attempts count
    const attemptsQuery = `
      SELECT COUNT(*) as count FROM assessment_attempts WHERE student_id = $1
    `
    const { rows: attemptStats } = await pool.query(attemptsQuery, [studentId])

    // Get completed attempts count
    const completedQuery = `
      SELECT COUNT(*) as count FROM assessment_attempts 
      WHERE student_id = $1 AND submitted_at IS NOT NULL
    `
    const { rows: completedStats } = await pool.query(completedQuery, [studentId])

    // Get pending assessments (enrolled but not attempted yet)
    const pendingAssessmentsQuery = `
      SELECT COUNT(*) as count
      FROM assessment_enrollments ae
      LEFT JOIN assessment_attempts aa ON ae.assessment_id = aa.assessment_id AND ae.student_id = aa.student_id
      WHERE ae.student_id = $1 AND aa.id IS NULL
    `
    const { rows: pendingStats } = await pool.query(pendingAssessmentsQuery, [studentId])

    // Get recent attempts
    const recentAttemptsQuery = `
      SELECT aa.submitted_at, aa.grade, aa.percentage, a.title as assessment_title
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.student_id = $1 AND aa.submitted_at IS NOT NULL
      ORDER BY aa.submitted_at DESC
      LIMIT 10
    `
    const { rows: recentAttempts } = await pool.query(recentAttemptsQuery, [studentId])

    const overview = {
      enrolledAssessments: Number.parseInt(assessmentStats[0].count),
      totalQuestionBlocks: Number.parseInt(questionBlockStats[0].count),
      attempts: Number.parseInt(attemptStats[0].count),
      completedAttempts: Number.parseInt(completedStats[0].count),
      pendingAssessments: Number.parseInt(pendingStats[0].count),
      recentAttempts,
    }

    console.log(`✅ Student overview statistics fetched successfully`)

    res.status(200).json({
      overview,
    })
  } catch (error) {
    console.error("❌ Get student overview error:", error)
    res.status(500).json({ message: "Server error while fetching student overview." })
  }
}
