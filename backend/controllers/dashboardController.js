import pool from "../DB/db.js"

/**
 * Gets admin dashboard overview statistics.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getAdminOverview = async (req, res) => {
  try {
    console.log(`🔄 Fetching admin overview`)

    // Total users
    const usersQuery = `SELECT COUNT(*) as count FROM users`
    const { rows: userStats } = await pool.query(usersQuery)

    // Total assessments
    const assessmentsQuery = `SELECT COUNT(*) as count FROM assessments`
    const { rows: assessmentStats } = await pool.query(assessmentsQuery)

    // Total resources
    const resourcesQuery = `SELECT COUNT(*) as count FROM resources`
    const { rows: resourceStats } = await pool.query(resourcesQuery)

    const overview = {
      totalUsers: Number.parseInt(userStats[0].count),
      totalAssessments: Number.parseInt(assessmentStats[0].count),
      totalResources: Number.parseInt(resourceStats[0].count),
    }

    console.log(`✅ Admin overview statistics fetched successfully`)

    res.status(200).json({
      success: true,
      message: "Admin overview retrieved successfully",
      data: overview,
    })
  } catch (error) {
    console.error("❌ Get admin overview error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching admin overview",
      error: error.message,
    })
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

    // Assessments count
    const assessmentsQuery = `
      SELECT COUNT(*) as count FROM assessments WHERE instructor_id = $1
    `
    const { rows: assessmentStats } = await pool.query(assessmentsQuery, [instructorId])

    // Resources count
    const resourcesQuery = `
      SELECT COUNT(*) as count FROM resources WHERE uploaded_by = $1
    `
    const { rows: resourceStats } = await pool.query(resourcesQuery, [instructorId])

    // Executed assessments count
    const executedQuery = `
      SELECT COUNT(*) as count FROM assessments WHERE instructor_id = $1 AND is_executed = true
    `
    const { rows: executedStats } = await pool.query(executedQuery, [instructorId])

    const overview = {
      assessments: Number.parseInt(assessmentStats[0].count),
      resources: Number.parseInt(resourceStats[0].count),
      executedAssessments: Number.parseInt(executedStats[0].count),
    }

    console.log(`✅ Instructor overview statistics fetched successfully`)

    res.status(200).json({
      success: true,
      message: "Instructor overview retrieved successfully",
      data: overview,
    })
  } catch (error) {
    console.error("❌ Get instructor overview error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching instructor overview",
      error: error.message,
    })
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

    // Enrolled assessments count (if enrollment exists)
    const assessmentsQuery = `
      SELECT COUNT(*) as count 
      FROM assessment_enrollments 
      WHERE student_id = $1
    `
    const { rows: assessmentStats } = await pool.query(assessmentsQuery, [studentId])

    // Completed assessments count
    const completedQuery = `
      SELECT COUNT(*) as count 
      FROM assessment_attempts 
      WHERE student_id = $1 AND status = 'completed'
    `
    const { rows: completedStats } = await pool.query(completedQuery, [studentId])

    const overview = {
      enrolledAssessments: Number.parseInt(assessmentStats[0].count),
      completedAssessments: Number.parseInt(completedStats[0].count),
    }

    console.log(`✅ Student overview statistics fetched successfully`)

    res.status(200).json({
      success: true,
      message: "Student overview retrieved successfully",
      data: overview,
    })
  } catch (error) {
    console.error("❌ Get student overview error:", error)
    res.status(500).json({
      success: false,
      message: "Server error while fetching student overview",
      error: error.message,
    })
  }
}