import {
  createAssessment,
  getAssessmentsByInstructor,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  enrollStudent,
  getEnrolledStudents,
  removeStudentEnrollment,
  getStudentAssessments,
  getAllAssessments,
  submitStudentAttempt,
  getStudentAttempts,
  getAssessmentStatistics,
  enrollMultipleStudentsDb,
  ensureAssessmentAttemptsTable,
} from "../models/assessmentModel.js"
import { getUserByEmail } from "../models/userModel.js"
import { sendAssessmentEnrollmentEmail } from "../services/emailService.js"

// Ensure tables exist on startup
ensureAssessmentAttemptsTable().catch(console.error)

/**
 * Create a new assessment
 * @route POST /api/assessments
 */
export const createNewAssessment = async (req, res) => {
  try {
    const { title, description, course_id, course_title, end_date, time_limit, passing_marks, settings } = req.body
    const instructor_id = req.user.id

    // Validate required fields
    if (!title) {
  return res.status(400).json({ message: "Title is required" })
}


    const newAssessment = await createAssessment({
      title,
      description,
      instructor_id,
      course_id,
      course_title,
      end_date,
      time_limit,
      passing_marks,
      settings: settings ? JSON.stringify(settings) : null,
    })

    res.status(201).json({
      message: "Assessment created successfully",
      assessment: newAssessment,
    })
  } catch (error) {
    console.error("Create assessment error:", error)
    res.status(500).json({ message: "Failed to create assessment", error: error.message })
  }
}

/**
 * Get all assessments for an instructor
 * @route GET /api/assessments/instructor
 */
export const getInstructorAssessments = async (req, res) => {
  try {
    const instructor_id = req.user.id
    console.log(`📋 Fetching assessments for instructor: ${instructor_id}`)

    const assessments = await getAssessmentsByInstructor(instructor_id)

    res.status(200).json({
      message: "Assessments retrieved successfully",
      assessments,
    })
  } catch (error) {
    console.error("❌ Get instructor assessments error:", error)
    res.status(500).json({ message: "Failed to retrieve assessments", error: error.message })
  }
}

/**
 * Get a specific assessment by ID
 * @route GET /api/assessments/:id
 */
export const getAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const user_id = req.user.id
    const user_role = req.user.role

    console.log(`📋 Fetching assessment ${assessment_id} for user ${user_id} (${user_role})`)

    const assessment = await getAssessmentById(assessment_id, user_id, user_role)

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" })
    }

    console.log("✅ Assessment fetched successfully")
    res.status(200).json({
      message: "Assessment retrieved successfully",
      assessment,
    })
  } catch (error) {
    console.error("❌ Get assessment error:", error)
    res.status(500).json({ message: "Failed to retrieve assessment", error: error.message })
  }
}

/**
 * Update an existing assessment
 * @route PUT /api/assessments/:id
 */
export const updateExistingAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id
    const { title, description, course_id, course_title, end_date, time_limit, passing_score, settings } = req.body

    // Check if assessment exists and belongs to instructor
    const existingAssessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!existingAssessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to update it" })
    }

    const updatedAssessment = await updateAssessment(assessment_id, {
      title,
      description,
      course_id,
      course_title,
      end_date,
      time_limit,
      passing_score,
      settings: settings ? JSON.stringify(settings) : existingAssessment.settings,
    })

    res.status(200).json({
      message: "Assessment updated successfully",
      assessment: updatedAssessment,
    })
  } catch (error) {
    console.error("❌ Update assessment error:", error)
    res.status(500).json({ message: "Failed to update assessment", error: error.message })
  }
}

/**
 * Delete an assessment
 * @route DELETE /api/assessments/:id
 */
export const deleteExistingAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id

    // Check if assessment exists and belongs to instructor
    const existingAssessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!existingAssessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to delete it" })
    }

    await deleteAssessment(assessment_id)

    res.status(200).json({
      message: "Assessment deleted successfully",
    })
  } catch (error) {
    console.error("❌ Delete assessment error:", error)
    res.status(500).json({ message: "Failed to delete assessment", error: error.message })
  }
}

/**
 * Helper function to enroll a single student
 */
const enrollSingleStudentHelper = async (assessmentId, studentEmail, instructorId) => {
  try {
    // Find student by email
    const student = await getUserByEmail(studentEmail)

    if (!student) {
      return { success: false, message: `Student with email ${studentEmail} not found` }
    }

    if (student.role !== "student") {
      return { success: false, message: `User ${studentEmail} is not a student` }
    }

    // Get assessment details
    const assessment = await getAssessmentById(assessmentId, instructorId, "instructor")

    if (!assessment) {
      return { success: false, message: "Assessment not found" }
    }

    // Enroll student
    await enrollStudent(assessmentId, student.id)

    // Send enrollment email
    try {
      await sendAssessmentEnrollmentEmail(
        student.email,
        student.name,
        assessment.title,
        assessment.course_title,
        assessment.end_date,
      )
    } catch (emailError) {
      console.error(`❌ Failed to send enrollment email: ${emailError}`)
      // Continue with enrollment even if email fails
    }

    return {
      success: true,
      message: "Student enrolled successfully",
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
    }
  } catch (error) {
    console.error(`❌ Error enrolling student: ${error.message}`)
    return { success: false, message: `Error enrolling student: ${error.message}` }
  }
}

/**
 * Enroll a single student in an assessment
 * @route POST /api/assessments/:id/enroll
 */
export const enrollSingleStudent = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: "Student email is required" })
    }

    console.log(`👥 Enrolling student ${email} in assessment ${assessment_id}`)

    const result = await enrollSingleStudentHelper(assessment_id, email, instructor_id)

    if (!result.success) {
      return res.status(400).json({ message: result.message })
    }

    console.log("✅ Student enrolled successfully")
    res.status(200).json({
      message: "Student enrolled successfully",
      student: result.student,
    })
  } catch (error) {
    console.error("❌ Enroll student error:", error)
    res.status(500).json({ message: "Failed to enroll student", error: error.message })
  }
}

/**
 * Enroll multiple students in an assessment
 * @route POST /api/assessments/:id/enroll-multiple
 */
export const enrollMultipleStudents = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id
    const { emails } = req.body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: "Valid student emails array is required" })
    }

    console.log(`👥 Enrolling ${emails.length} students in assessment ${assessment_id}`)

    // Get assessment details
    const assessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" })
    }

    // Process each email
    const successfulEnrollments = []
    const failedEnrollments = []

    // First, validate all emails and get student IDs
    for (const email of emails) {
      const student = await getUserByEmail(email)

      if (!student) {
        failedEnrollments.push({ email, reason: "Student not found" })
        continue
      }

      if (student.role !== "student") {
        failedEnrollments.push({ email, reason: "User is not a student" })
        continue
      }

      successfulEnrollments.push({
        email,
        student_id: student.id,
        name: student.name,
      })
    }

    // Bulk enroll all valid students
    if (successfulEnrollments.length > 0) {
      const studentIds = successfulEnrollments.map((item) => item.student_id)
      await enrollMultipleStudentsDb(assessment_id, studentIds)

      // Send emails (don't wait for completion)
      for (const enrollment of successfulEnrollments) {
        try {
          await sendAssessmentEnrollmentEmail(
            enrollment.email,
            enrollment.name,
            assessment.title,
            assessment.course_title,
            assessment.end_date,
          )
        } catch (emailError) {
          console.error(`❌ Failed to send enrollment email to ${enrollment.email}: ${emailError}`)
          // Continue with other enrollments even if email fails
        }
      }
    }

    console.log(`✅ Enrolled ${successfulEnrollments.length} students successfully`)
    console.log(`❌ Failed to enroll ${failedEnrollments.length} students`)

    res.status(200).json({
      message: `Enrolled ${successfulEnrollments.length} students successfully, ${failedEnrollments.length} failed`,
      successful: successfulEnrollments,
      failed: failedEnrollments,
    })
  } catch (error) {
    console.error("❌ Enroll multiple students error:", error)
    res.status(500).json({ message: "Failed to enroll students", error: error.message })
  }
}

/**
 * Get all students enrolled in an assessment
 * @route GET /api/assessments/:id/students
 */
export const getAssessmentStudents = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id

    console.log(`👥 Fetching enrolled students for assessment ${assessment_id}`)

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to access it" })
    }

    const students = await getEnrolledStudents(assessment_id)

    console.log(`✅ Found ${students.length} enrolled students`)
    res.status(200).json({
      message: "Students retrieved successfully",
      students,
    })
  } catch (error) {
    console.error("❌ Get assessment students error:", error)
    res.status(500).json({ message: "Failed to retrieve enrolled students", error: error.message })
  }
}

/**
 * Unenroll a student from an assessment
 * @route DELETE /api/assessments/:id/students/:studentId
 */
export const unenrollStudent = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const student_id = req.params.studentId
    const instructor_id = req.user.id

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to access it" })
    }

    await removeStudentEnrollment(assessment_id, student_id)

    res.status(200).json({
      message: "Student unenrolled successfully",
    })
  } catch (error) {
    console.error("❌ Unenroll student error:", error)
    res.status(500).json({ message: "Failed to unenroll student", error: error.message })
  }
}

/**
 * Get all assessments for a student
 * @route GET /api/assessments/student
 */
export const getStudentAssessmentList = async (req, res) => {
  try {
    const student_id = req.user.id

    console.log(`📋 Fetching assessments for student: ${student_id}`)

    const assessments = await getStudentAssessments(student_id)

    console.log(`✅ Found ${assessments.length} assessments for student`)

   res.status(200).json({
  success: true,
  data: assessments,
})

  } catch (error) {
    console.error("❌ Get student assessments error:", error)
    res.status(500).json({ message: "Failed to retrieve student assessments", error: error.message })
  }
}

/**
 * Get all assessments (admin only)
 * @route GET /api/assessments/all
 */
export const getAllAssessmentList = async (req, res) => {
  try {
    const assessments = await getAllAssessments()

    res.status(200).json({
      message: "All assessments retrieved successfully",
      assessments,
    })
  } catch (error) {
    console.error("❌ Get all assessments error:", error)
    res.status(500).json({ message: "Failed to retrieve all assessments", error: error.message })
  }
}

/**
 * Submit an assessment attempt
 * @route POST /api/assessments/:id/submit
 */
export const submitAssessment = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const student_id = req.user.id
    const { answers, time_taken } = req.body

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Valid answers array is required" })
    }

    const result = await submitStudentAttempt(assessment_id, student_id, answers, time_taken)

    res.status(200).json({
      message: "Assessment submitted successfully",
      result,
    })
  } catch (error) {
    console.error("❌ Submit assessment error:", error)
    res.status(500).json({ message: "Failed to submit assessment", error: error.message })
  }
}

/**
 * Get assessment attempts for a student
 * @route GET /api/assessments/:id/attempts
 */
export const getAttempts = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const user_id = req.user.id
    const user_role = req.user.role

    const attempts = await getStudentAttempts(assessment_id, user_id, user_role)

    res.status(200).json({
      message: "Assessment attempts retrieved successfully",
      attempts,
    })
  } catch (error) {
    console.error("❌ Get assessment attempts error:", error)
    res.status(500).json({ message: "Failed to retrieve assessment attempts", error: error.message })
  }
}

/**
 * Get assessment statistics
 * @route GET /api/assessments/:id/statistics
 */
export const getStatistics = async (req, res) => {
  try {
    const assessment_id = req.params.id
    const instructor_id = req.user.id

    // Check if assessment exists and belongs to instructor
    const assessment = await getAssessmentById(assessment_id, instructor_id, "instructor")

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found or you don't have permission to access it" })
    }

    const statistics = await getAssessmentStatistics(assessment_id)

    res.status(200).json({
      message: "Assessment statistics retrieved successfully",
      statistics,
    })
  } catch (error) {
    console.error("❌ Get assessment statistics error:", error)
    res.status(500).json({ message: "Failed to retrieve assessment statistics", error: error.message })
  }
}
