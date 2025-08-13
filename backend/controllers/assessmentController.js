import {
  createAssessment as createAssessmentModel,
  getAssessmentsByInstructor,
  getAssessmentById as getAssessmentByIdModel,
  updateAssessment as updateAssessmentModel,
  deleteAssessment as deleteAssessmentModel,
  enrollStudent,
  getEnrolledStudents,
  getStudentAssessments as getStudentAssessmentsModel,
  unenrollStudent,
  getAllAssessments as getAllAssessmentsModel,
} from "../models/assessmentModel.js"
// Update the import at the top
import pool from "../DB/db.js"
import { sendEnrollmentEmail } from "../services/emailService.js"

// Create assessment
export const createAssessment = async (req, res) => {
  try {
    console.log("📝 Creating assessment for instructor:", req.user.id)

    const assessmentData = {
      ...req.body,
      instructor_id: req.user.id,
    }

    const assessment = await createAssessmentModel(assessmentData)

    console.log("✅ Assessment created successfully:", assessment.id)
    res.status(201).json({
      success: true,
      message: "Assessment created successfully",
      data: assessment,
    })
  } catch (error) {
    console.error("❌ Create assessment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create assessment",
    })
  }
}

// Get instructor's assessments
export const getInstructorAssessments = async (req, res) => {
  try {
    console.log("🔄 Fetching assessments for instructor:", req.user.id)

    const assessments = await getAssessmentsByInstructor(req.user.id)

    console.log("✅ Found assessments:", assessments.length)
    res.status(200).json({
      success: true,
      data: assessments,
    })
  } catch (error) {
    console.error("❌ Get instructor assessments error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch assessments",
    })
  }
}

// Get assessment by ID
export const getAssessmentById = async (req, res) => {
  try {
    const { assessmentId } = req.params
    console.log("🔍 Fetching assessment:", assessmentId)

    const assessment = await getAssessmentByIdModel(assessmentId)

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      })
    }

    // Check if user has access to this assessment
    if (req.user.role === "student") {
      // Check if student is enrolled
      const isEnrolled = await pool.query(
        "SELECT id FROM assessment_enrollments WHERE assessment_id = $1 AND student_id = $2",
        [assessmentId, req.user.id],
      )

      if (isEnrolled.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this assessment",
        })
      }
    } else if (req.user.role === "instructor" && assessment.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own assessments",
      })
    }

    console.log("✅ Assessment found:", assessment.title)
    res.status(200).json({
      success: true,
      data: assessment,
    })
  } catch (error) {
    console.error("❌ Get assessment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch assessment",
    })
  }
}

// Update assessment
export const updateAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params
    console.log("📝 Updating assessment:", assessmentId)

    // Check if assessment belongs to instructor
    const existingAssessment = await getAssessmentByIdModel(assessmentId)
    if (!existingAssessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      })
    }

    if (req.user.role === "instructor" && existingAssessment.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own assessments",
      })
    }

    const updatedAssessment = await updateAssessmentModel(assessmentId, req.body)

    console.log("✅ Assessment updated successfully")
    res.status(200).json({
      success: true,
      message: "Assessment updated successfully",
      data: updatedAssessment,
    })
  } catch (error) {
    console.error("❌ Update assessment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update assessment",
    })
  }
}

// Delete assessment
export const deleteAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params
    console.log("🗑️ Deleting assessment:", assessmentId)

    // Check if assessment belongs to instructor
    const existingAssessment = await getAssessmentByIdModel(assessmentId)
    if (!existingAssessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      })
    }

    if (req.user.role === "instructor" && existingAssessment.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own assessments",
      })
    }

    const deleted = await deleteAssessmentModel(assessmentId)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
      })
    }

    console.log("✅ Assessment deleted successfully")
    res.status(200).json({
      success: true,
      message: "Assessment deleted successfully",
    })
  } catch (error) {
    console.error("❌ Delete assessment error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete assessment",
    })
  }
}

// Enroll student in assessment
export const enrollStudentInAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params
    const { studentEmail } = req.body // Changed from studentId to studentEmail

    console.log("👥 Enrolling student:", studentEmail, "in assessment:", assessmentId)

    // First, find the student by email
    const studentQuery = "SELECT id, name, email FROM users WHERE email = $1 AND role = 'student'"
    const studentResult = await pool.query(studentQuery, [studentEmail])

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found with this email address",
      })
    }

    const student = studentResult.rows[0]
    const enrollment = await enrollStudent(assessmentId, student.id)

    // Send enrollment notification email
    try {
      const assessment = await getAssessmentByIdModel(assessmentId)
      await sendEnrollmentEmail(student.email, student.name, assessment.title, req.user.name)
    } catch (emailError) {
      console.error("Failed to send enrollment email:", emailError)
      // Don't fail the enrollment if email fails
    }

    console.log("✅ Student enrolled successfully")
    res.status(201).json({
      success: true,
      message: "Student enrolled successfully",
      data: enrollment,
    })
  } catch (error) {
    console.error("❌ Enroll student error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to enroll student",
    })
  }
}

// Get enrolled students
export const getAssessmentStudents = async (req, res) => {
  try {
    const { assessmentId } = req.params
    console.log("👥 Fetching enrolled students for assessment:", assessmentId)

    const students = await getEnrolledStudents(assessmentId)

    console.log("✅ Found enrolled students:", students.length)
    res.status(200).json({
      success: true,
      data: students,
    })
  } catch (error) {
    console.error("❌ Get assessment students error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch enrolled students",
    })
  }
}

// Get student's assessments
export const getStudentAssessments = async (req, res) => {
  try {
    console.log("📚 Fetching assessments for student:", req.user.id)

    const assessments = await getStudentAssessmentsModel(req.user.id)

    console.log("✅ Found student assessments:", assessments.length)
    res.status(200).json({
      success: true,
      data: assessments,
    })
  } catch (error) {
    console.error("❌ Get student assessments error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student assessments",
    })
  }
}

// Unenroll student from assessment
export const unenrollStudentFromAssessment = async (req, res) => {
  try {
    const { assessmentId, studentId } = req.params
    console.log("👥 Unenrolling student:", studentId, "from assessment:", assessmentId)

    const unenrolled = await unenrollStudent(assessmentId, studentId)

    if (!unenrolled) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      })
    }

    console.log("✅ Student unenrolled successfully")
    res.status(200).json({
      success: true,
      message: "Student unenrolled successfully",
    })
  } catch (error) {
    console.error("❌ Unenroll student error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to unenroll student",
    })
  }
}

// Get all assessments (admin only)
export const getAllAssessments = async (req, res) => {
  try {
    console.log("🔍 Fetching all assessments (admin)")

    const assessments = await getAllAssessmentsModel()

    console.log("✅ Found all assessments:", assessments.length)
    res.status(200).json({
      success: true,
      data: assessments,
    })
  } catch (error) {
    console.error("❌ Get all assessments error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch all assessments",
    })
  }
}
