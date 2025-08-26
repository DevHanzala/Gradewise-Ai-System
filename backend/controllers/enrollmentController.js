import {
  processCSVEnrollment,
  previewBulkEnrollment,
  executeBulkEnrollment,
  getEnrollmentStats,
  exportEnrollmentData
} from "../models/enrollmentModel.js"
import { getAssessmentById } from "../models/assessmentModel.js"

/**
 * Enhanced Enrollment Controller
 * Handles bulk enrollment, CSV import, preview, and export functionality
 */

/**
 * Process CSV file for bulk enrollment
 * @route POST /api/enrollment/process-csv
 */
export const processCSVFile = async (req, res) => {
  try {
    const { csvData } = req.body

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: "CSV data is required"
      })
    }

    console.log("📄 Processing CSV file for enrollment")

    const result = await processCSVEnrollment(csvData)

    res.status(200).json({
      success: true,
      message: "CSV processed successfully",
      data: result
    })
  } catch (error) {
    console.error("❌ Process CSV error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process CSV file",
      error: error.message
    })
  }
}

/**
 * Preview bulk enrollment
 * @route POST /api/enrollment/:assessmentId/preview
 */
export const previewEnrollment = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    const instructorId = req.user.id
    const { enrollmentData } = req.body

    if (!enrollmentData || !Array.isArray(enrollmentData)) {
      return res.status(400).json({
        success: false,
        message: "Valid enrollment data array is required"
      })
    }

    console.log(`👀 Previewing enrollment for assessment ${assessmentId}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessmentId, instructorId, "instructor")

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it"
      })
    }

    const preview = await previewBulkEnrollment(assessmentId, enrollmentData)

    res.status(200).json({
      success: true,
      message: "Enrollment preview generated successfully",
      data: preview
    })
  } catch (error) {
    console.error("❌ Preview enrollment error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to preview enrollment",
      error: error.message
    })
  }
}

/**
 * Execute bulk enrollment
 * @route POST /api/enrollment/:assessmentId/execute
 */
export const executeEnrollment = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    const instructorId = req.user.id
    const { enrollmentData } = req.body

    if (!enrollmentData || !Array.isArray(enrollmentData)) {
      return res.status(400).json({
        success: false,
        message: "Valid enrollment data array is required"
      })
    }

    console.log(`✅ Executing bulk enrollment for assessment ${assessmentId}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessmentId, instructorId, "instructor")

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it"
      })
    }

    const results = await executeBulkEnrollment(assessmentId, enrollmentData)

    res.status(200).json({
      success: true,
      message: `Bulk enrollment completed. ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    })
  } catch (error) {
    console.error("❌ Execute enrollment error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to execute bulk enrollment",
      error: error.message
    })
  }
}

/**
 * Get enrollment statistics
 * @route GET /api/enrollment/:assessmentId/stats
 */
export const getEnrollmentStatistics = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    const instructorId = req.user.id

    console.log(`📊 Getting enrollment stats for assessment ${assessmentId}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessmentId, instructorId, "instructor")

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it"
      })
    }

    const stats = await getEnrollmentStats(assessmentId)

    res.status(200).json({
      success: true,
      message: "Enrollment statistics retrieved successfully",
      data: stats
    })
  } catch (error) {
    console.error("❌ Get enrollment stats error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve enrollment statistics",
      error: error.message
    })
  }
}

/**
 * Export enrollment data to CSV
 * @route GET /api/enrollment/:assessmentId/export
 */
export const exportEnrollmentCSV = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    const instructorId = req.user.id

    console.log(`📤 Exporting enrollment data for assessment ${assessmentId}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessmentId, instructorId, "instructor")

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it"
      })
    }

    const csvData = await exportEnrollmentData(assessmentId)

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="enrollment-data-${assessmentId}.csv"`)

    res.status(200).send(csvData)
  } catch (error) {
    console.error("❌ Export enrollment error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to export enrollment data",
      error: error.message
    })
  }
}

/**
 * Bulk enroll students by email list
 * @route POST /api/enrollment/:assessmentId/bulk-email
 */
export const bulkEnrollByEmail = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId)
    const instructorId = req.user.id
    const { emails } = req.body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid email array is required"
      })
    }

    console.log(`📧 Bulk enrolling ${emails.length} students by email for assessment ${assessmentId}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessmentId, instructorId, "instructor")

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found or you don't have permission to access it"
      })
    }

    // Process emails and create enrollment data
    const enrollmentData = []
    const errors = []

    for (const email of emails) {
      try {
        // Import user model function
        const { getUserByEmail } = await import("../models/userModel.js")
        const user = await getUserByEmail(email)

        if (!user) {
          errors.push({ email, error: "User not found" })
          continue
        }

        if (user.role !== "student") {
          errors.push({ email, error: "User is not a student" })
          continue
        }

        enrollmentData.push({
          email,
          name: user.name,
          student_id: user.id
        })
      } catch (error) {
        errors.push({ email, error: error.message })
      }
    }

    // Execute enrollment
    const results = await executeBulkEnrollment(assessmentId, enrollmentData)

    // Combine results
    const finalResults = {
      successful: results.successful,
      failed: [...results.failed, ...errors],
      total_processed: emails.length,
      valid_emails: enrollmentData.length,
      invalid_emails: errors.length
    }

    res.status(200).json({
      success: true,
      message: `Bulk email enrollment completed. ${finalResults.successful.length} successful, ${finalResults.failed.length} failed`,
      data: finalResults
    })
  } catch (error) {
    console.error("❌ Bulk email enrollment error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to process bulk email enrollment",
      error: error.message
    })
  }
}

