import db from "../DB/db.js"
import { getUserByEmail } from "./userModel.js"

/**
 * Enhanced Enrollment Model
 * Handles bulk enrollment, CSV import, preview, and validation
 */

/**
 * Process CSV data for bulk enrollment
 * @param {string} csvData - Raw CSV data
 * @returns {Array} Processed enrollment data
 */
export const processCSVEnrollment = async (csvData) => {
  try {
    console.log("📄 Processing CSV enrollment data")

    // Parse CSV data
    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validate required headers
    const requiredHeaders = ['email', 'name']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
    }

    const enrollments = []
    const errors = []

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map(v => v.trim())
      const row = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // Validate email
      const email = row.email
      if (!email || !isValidEmail(email)) {
        errors.push({
          row: i + 1,
          email,
          error: 'Invalid email format'
        })
        continue
      }

      // Check if user exists
      const existingUser = await getUserByEmail(email)
      if (!existingUser) {
        errors.push({
          row: i + 1,
          email,
          error: 'User not found'
        })
        continue
      }

      if (existingUser.role !== 'student') {
        errors.push({
          row: i + 1,
          email,
          error: 'User is not a student'
        })
        continue
      }

      enrollments.push({
        email,
        name: row.name || existingUser.name,
        student_id: existingUser.id,
        status: 'valid'
      })
    }

    return {
      valid_enrollments: enrollments,
      errors,
      total_rows: lines.length - 1,
      valid_count: enrollments.length,
      error_count: errors.length
    }
  } catch (error) {
    console.error("❌ Error processing CSV enrollment:", error)
    throw error
  }
}

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Preview bulk enrollment without actually enrolling
 * @param {number} assessmentId - Assessment ID
 * @param {Array} enrollmentData - Array of enrollment objects
 * @returns {Object} Preview results
 */
export const previewBulkEnrollment = async (assessmentId, enrollmentData) => {
  try {
    console.log(`👀 Previewing bulk enrollment for assessment ${assessmentId}`)

    // Get assessment details
    const assessment = await db.query(
      "SELECT id, title, instructor_id FROM assessments WHERE id = $1",
      [assessmentId]
    )

    if (assessment.rows.length === 0) {
      throw new Error("Assessment not found")
    }

    const preview = {
      assessment_id: assessmentId,
      assessment_title: assessment.rows[0].title,
      total_enrollments: enrollmentData.length,
      new_enrollments: [],
      already_enrolled: [],
      invalid_enrollments: []
    }

    // Check each enrollment
    for (const enrollment of enrollmentData) {
      // Check if already enrolled
      const existingEnrollment = await db.query(
        "SELECT * FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2",
        [assessmentId, enrollment.student_id]
      )

      if (existingEnrollment.rows.length > 0) {
        preview.already_enrolled.push({
          email: enrollment.email,
          name: enrollment.name,
          enrolled_at: existingEnrollment.rows[0].enrolled_at
        })
      } else {
        preview.new_enrollments.push({
          email: enrollment.email,
          name: enrollment.name,
          student_id: enrollment.student_id
        })
      }
    }

    return preview
  } catch (error) {
    console.error("❌ Error previewing bulk enrollment:", error)
    throw error
  }
}

/**
 * Execute bulk enrollment
 * @param {number} assessmentId - Assessment ID
 * @param {Array} enrollmentData - Array of valid enrollment objects
 * @returns {Object} Enrollment results
 */
export const executeBulkEnrollment = async (assessmentId, enrollmentData) => {
  try {
    console.log(`✅ Executing bulk enrollment for assessment ${assessmentId}`)

    const results = {
      successful: [],
      failed: [],
      total_processed: enrollmentData.length
    }

    // Process each enrollment
    for (const enrollment of enrollmentData) {
      try {
        // Check if already enrolled
        const existingEnrollment = await db.query(
          "SELECT * FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2",
          [assessmentId, enrollment.student_id]
        )

        if (existingEnrollment.rows.length > 0) {
          results.failed.push({
            email: enrollment.email,
            error: 'Already enrolled'
          })
          continue
        }

        // Enroll student
        await db.query(
          "INSERT INTO assessment_enrollments (assessment_id, student_id, enrolled_at) VALUES ($1, $2, NOW())",
          [assessmentId, enrollment.student_id]
        )

        results.successful.push({
          email: enrollment.email,
          name: enrollment.name,
          student_id: enrollment.student_id
        })

      } catch (error) {
        console.error(`❌ Failed to enroll ${enrollment.email}:`, error)
        results.failed.push({
          email: enrollment.email,
          error: error.message
        })
      }
    }

    return results
  } catch (error) {
    console.error("❌ Error executing bulk enrollment:", error)
    throw error
  }
}

/**
 * Get enrollment statistics for an assessment
 * @param {number} assessmentId - Assessment ID
 * @returns {Object} Enrollment statistics
 */
export const getEnrollmentStats = async (assessmentId) => {
  try {
    console.log(`📊 Getting enrollment stats for assessment ${assessmentId}`)

    // Get total enrollments
    const totalEnrollments = await db.query(
      "SELECT COUNT(*) as count FROM assessment_enrollments WHERE assessment_id = $1",
      [assessmentId]
    )

    // Get completed attempts
    const completedAttempts = await db.query(
      `SELECT COUNT(*) as count 
       FROM assessment_attempts aa
       JOIN assessment_enrollments ae ON aa.assessment_id = ae.assessment_id 
         AND aa.student_id = ae.student_id
       WHERE aa.assessment_id = $1 AND aa.submitted_at IS NOT NULL`,
      [assessmentId]
    )

    // Get pending attempts
    const pendingAttempts = await db.query(
      `SELECT COUNT(*) as count 
       FROM assessment_enrollments ae
       LEFT JOIN assessment_attempts aa ON ae.assessment_id = aa.assessment_id 
         AND ae.student_id = aa.student_id
       WHERE ae.assessment_id = $1 AND aa.id IS NULL`,
      [assessmentId]
    )

    // Get recent enrollments (last 7 days)
    const recentEnrollments = await db.query(
      "SELECT COUNT(*) as count FROM assessment_enrollments WHERE assessment_id = $1 AND enrolled_at >= NOW() - INTERVAL '7 days'",
      [assessmentId]
    )

    return {
      total_enrolled: parseInt(totalEnrollments.rows[0].count),
      completed_attempts: parseInt(completedAttempts.rows[0].count),
      pending_attempts: parseInt(pendingAttempts.rows[0].count),
      recent_enrollments: parseInt(recentEnrollments.rows[0].count),
      completion_rate: totalEnrollments.rows[0].count > 0 
        ? Math.round((completedAttempts.rows[0].count / totalEnrollments.rows[0].count) * 100)
        : 0
    }
  } catch (error) {
    console.error("❌ Error getting enrollment stats:", error)
    throw error
  }
}

/**
 * Export enrollment data to CSV
 * @param {number} assessmentId - Assessment ID
 * @returns {string} CSV data
 */
export const exportEnrollmentData = async (assessmentId) => {
  try {
    console.log(`📤 Exporting enrollment data for assessment ${assessmentId}`)

    const query = `
      SELECT 
        u.email,
        u.name,
        ae.enrolled_at,
        CASE 
          WHEN aa.submitted_at IS NOT NULL THEN 'Completed'
          WHEN aa.id IS NOT NULL THEN 'In Progress'
          ELSE 'Not Started'
        END as status,
        aa.percentage,
        aa.grade,
        aa.submitted_at
      FROM assessment_enrollments ae
      JOIN users u ON ae.student_id = u.id
      LEFT JOIN assessment_attempts aa ON ae.assessment_id = aa.assessment_id 
        AND ae.student_id = aa.student_id
      WHERE ae.assessment_id = $1
      ORDER BY ae.enrolled_at DESC
    `

    const result = await db.query(query, [assessmentId])

    // Generate CSV
    const headers = [
      'Email',
      'Name',
      'Enrolled At',
      'Status',
      'Score (%)',
      'Grade',
      'Submitted At'
    ]

    const csvRows = [
      headers.join(','),
      ...result.rows.map(row => [
        row.email,
        row.name,
        row.enrolled_at,
        row.status,
        row.percentage || '',
        row.grade || '',
        row.submitted_at || ''
      ].join(','))
    ]

    return csvRows.join('\n')
  } catch (error) {
    console.error("❌ Error exporting enrollment data:", error)
    throw error
  }
}
