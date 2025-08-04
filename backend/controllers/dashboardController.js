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

    // Get total courses count
    const coursesQuery = `SELECT COUNT(*) as count FROM courses`
    const { rows: courseStats } = await pool.query(coursesQuery)

    // Get total enrollments count
    const enrollmentsQuery = `SELECT COUNT(*) as count FROM students_courses`
    const { rows: enrollmentStats } = await pool.query(enrollmentsQuery)

    // Get total assignments count
    const assignmentsQuery = `SELECT COUNT(*) as count FROM assignments`
    const { rows: assignmentStats } = await pool.query(assignmentsQuery)

    // Get total submissions count
    const submissionsQuery = `SELECT COUNT(*) as count FROM submissions`
    const { rows: submissionStats } = await pool.query(submissionsQuery)

    // Get recent activity (last 10 enrollments)
    const recentActivityQuery = `
      SELECT sc.enrolled_at, u.name as student_name, c.title as course_title
      FROM students_courses sc
      JOIN users u ON sc.student_id = u.id
      JOIN courses c ON sc.course_id = c.id
      ORDER BY sc.enrolled_at DESC
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
      courses: Number.parseInt(courseStats[0].count),
      enrollments: Number.parseInt(enrollmentStats[0].count),
      assignments: Number.parseInt(assignmentStats[0].count),
      submissions: Number.parseInt(submissionStats[0].count),
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

    // Get instructor's courses count
    const coursesQuery = `
      SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1
    `
    const { rows: courseStats } = await pool.query(coursesQuery, [instructorId])

    // Get total students enrolled in instructor's courses
    const studentsQuery = `
      SELECT COUNT(DISTINCT sc.student_id) as count
      FROM students_courses sc
      JOIN courses c ON sc.course_id = c.id
      WHERE c.instructor_id = $1
    `
    const { rows: studentStats } = await pool.query(studentsQuery, [instructorId])

    // Get instructor's assignments count
    const assignmentsQuery = `
      SELECT COUNT(*) as count FROM assignments WHERE created_by = $1
    `
    const { rows: assignmentStats } = await pool.query(assignmentsQuery, [instructorId])

    // Get submissions for instructor's assignments
    const submissionsQuery = `
      SELECT COUNT(*) as count
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE a.created_by = $1
    `
    const { rows: submissionStats } = await pool.query(submissionsQuery, [instructorId])

    // Get pending submissions (ungraded)
    const pendingSubmissionsQuery = `
      SELECT COUNT(*) as count
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      WHERE a.created_by = $1 AND s.grade IS NULL
    `
    const { rows: pendingStats } = await pool.query(pendingSubmissionsQuery, [instructorId])

    // Get recent submissions for instructor's assignments
    const recentSubmissionsQuery = `
      SELECT s.submitted_at, u.name as student_name, a.title as assignment_title,
             c.title as course_title
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE a.created_by = $1
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `
    const { rows: recentSubmissions } = await pool.query(recentSubmissionsQuery, [instructorId])

    const overview = {
      courses: Number.parseInt(courseStats[0].count),
      students: Number.parseInt(studentStats[0].count),
      assignments: Number.parseInt(assignmentStats[0].count),
      submissions: Number.parseInt(submissionStats[0].count),
      pendingGrades: Number.parseInt(pendingStats[0].count),
      recentSubmissions,
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

    // Get student's enrolled courses count
    const coursesQuery = `
      SELECT COUNT(*) as count FROM students_courses WHERE student_id = $1
    `
    const { rows: courseStats } = await pool.query(coursesQuery, [studentId])

    // Get total assignments for student's enrolled courses
    const assignmentsQuery = `
      SELECT COUNT(*) as count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN students_courses sc ON c.id = sc.course_id
      WHERE sc.student_id = $1
    `
    const { rows: assignmentStats } = await pool.query(assignmentsQuery, [studentId])

    // Get student's submissions count
    const submissionsQuery = `
      SELECT COUNT(*) as count FROM submissions WHERE student_id = $1
    `
    const { rows: submissionStats } = await pool.query(submissionsQuery, [studentId])

    // Get graded submissions count
    const gradedQuery = `
      SELECT COUNT(*) as count FROM submissions 
      WHERE student_id = $1 AND grade IS NOT NULL
    `
    const { rows: gradedStats } = await pool.query(gradedQuery, [studentId])

    // Get pending assignments (not submitted yet)
    const pendingAssignmentsQuery = `
      SELECT COUNT(*) as count
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      JOIN students_courses sc ON c.id = sc.course_id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = $1
      WHERE sc.student_id = $1 AND s.id IS NULL
    `
    const { rows: pendingStats } = await pool.query(pendingAssignmentsQuery, [studentId])

    // Get recent grades
    const recentGradesQuery = `
      SELECT s.grade, s.feedback, s.submitted_at, a.title as assignment_title,
             c.title as course_title
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      WHERE s.student_id = $1 AND s.grade IS NOT NULL
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `
    const { rows: recentGrades } = await pool.query(recentGradesQuery, [studentId])

    const overview = {
      enrolledCourses: Number.parseInt(courseStats[0].count),
      totalAssignments: Number.parseInt(assignmentStats[0].count),
      submissions: Number.parseInt(submissionStats[0].count),
      gradedSubmissions: Number.parseInt(gradedStats[0].count),
      pendingAssignments: Number.parseInt(pendingStats[0].count),
      recentGrades,
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
