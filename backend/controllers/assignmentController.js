import {
  createAssignment,
  findAssignmentsByCourse,
  findAssignmentById,
  updateAssignment,
  deleteAssignment,
  getStudentAssignments,
  getAllAssignments,
  getInstructorAssignments,
} from "../models/assignmentModel.js"
import { findCourseById, isStudentEnrolled } from "../models/courseModel.js"

/**
 * Creates a new assignment (Admin/Instructor only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const createNewAssignment = async (req, res) => {
  const { title, description, courseId, dueDate } = req.body
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Creating new assignment: ${title} for course ${courseId}`)

    // Validate required fields
    if (!title || !description || !courseId) {
      return res.status(400).json({ message: "Title, description, and course ID are required." })
    }

    // Check if course exists
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    // Authorization check - only course instructor or admin can create assignments
    if (userRole === "instructor" && course.instructor_id !== userId) {
      return res.status(403).json({ message: "You can only create assignments for your own courses." })
    }

    // Parse due date if provided
    let parsedDueDate = null
    if (dueDate) {
      parsedDueDate = new Date(dueDate)
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: "Invalid due date format." })
      }
    }

    // Create the assignment
    const newAssignment = await createAssignment(title, description, courseId, userId, parsedDueDate)
    console.log(`✅ Assignment created successfully:`, newAssignment)

    res.status(201).json({
      message: "Assignment created successfully.",
      assignment: newAssignment,
    })
  } catch (error) {
    console.error("❌ Create assignment error:", error)
    res.status(500).json({ message: "Server error while creating assignment." })
  }
}

/**
 * Gets assignments for a specific course.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getCourseAssignments = async (req, res) => {
  const { courseId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Fetching assignments for course ${courseId}`)

    // Check if course exists
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    // Authorization check
    if (userRole === "student") {
      // Students can only view assignments for courses they're enrolled in
      const isEnrolled = await isStudentEnrolled(userId, courseId)
      if (!isEnrolled) {
        return res.status(403).json({ message: "You are not enrolled in this course." })
      }
    } else if (userRole === "instructor" && course.instructor_id !== userId) {
      // Instructors can only view assignments for their own courses
      return res.status(403).json({ message: "You can only view assignments for your own courses." })
    }
    // Admins can view assignments for any course

    const assignments = await findAssignmentsByCourse(courseId)
    console.log(`✅ Found ${assignments.length} assignments for course`)

    res.status(200).json({
      assignments,
      course: {
        id: course.id,
        title: course.title,
        instructor_name: course.instructor_name,
      },
    })
  } catch (error) {
    console.error("❌ Get course assignments error:", error)
    res.status(500).json({ message: "Server error while fetching course assignments." })
  }
}

/**
 * Gets a specific assignment by ID (with authorization check).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getAssignmentById = async (req, res) => {
  const { assignmentId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Fetching assignment ${assignmentId} for user ${userId} (${userRole})`)

    const assignment = await findAssignmentById(assignmentId)
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." })
    }

    // Authorization check
    if (userRole === "student") {
      // Students can only view assignments for courses they're enrolled in
      const isEnrolled = await isStudentEnrolled(userId, assignment.course_id)
      if (!isEnrolled) {
        return res.status(403).json({ message: "You are not enrolled in this course." })
      }
    } else if (userRole === "instructor" && assignment.instructor_id !== userId) {
      // Instructors can only view assignments for their own courses
      return res.status(403).json({ message: "You can only view assignments for your own courses." })
    }
    // Admins can view any assignment

    console.log(`✅ Assignment found:`, assignment)

    res.status(200).json({
      assignment,
    })
  } catch (error) {
    console.error("❌ Get assignment by ID error:", error)
    res.status(500).json({ message: "Server error while fetching assignment." })
  }
}

/**
 * Updates an assignment (Admin/Instructor only - own courses).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const updateExistingAssignment = async (req, res) => {
  const { assignmentId } = req.params
  const { title, description, dueDate } = req.body
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Updating assignment ${assignmentId}`)

    // Check if assignment exists
    const assignment = await findAssignmentById(assignmentId)
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." })
    }

    // Authorization check
    if (userRole === "instructor" && assignment.instructor_id !== userId) {
      return res.status(403).json({ message: "You can only update assignments for your own courses." })
    }

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." })
    }

    // Parse due date if provided
    let parsedDueDate = null
    if (dueDate) {
      parsedDueDate = new Date(dueDate)
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: "Invalid due date format." })
      }
    }

    // Update the assignment
    const updatedAssignment = await updateAssignment(assignmentId, title, description, parsedDueDate)
    console.log(`✅ Assignment updated successfully:`, updatedAssignment)

    res.status(200).json({
      message: "Assignment updated successfully.",
      assignment: updatedAssignment,
    })
  } catch (error) {
    console.error("❌ Update assignment error:", error)
    res.status(500).json({ message: "Server error while updating assignment." })
  }
}

/**
 * Deletes an assignment (Admin/Instructor only - own courses).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const deleteExistingAssignment = async (req, res) => {
  const { assignmentId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Deleting assignment ${assignmentId}`)

    // Check if assignment exists
    const assignment = await findAssignmentById(assignmentId)
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." })
    }

    // Authorization check
    if (userRole === "instructor" && assignment.instructor_id !== userId) {
      return res.status(403).json({ message: "You can only delete assignments for your own courses." })
    }

    // Delete the assignment
    const deletedAssignment = await deleteAssignment(assignmentId)
    console.log(`✅ Assignment deleted successfully:`, deletedAssignment)

    res.status(200).json({
      message: "Assignment deleted successfully.",
      assignment: deletedAssignment,
    })
  } catch (error) {
    console.error("❌ Delete assignment error:", error)
    res.status(500).json({ message: "Server error while deleting assignment." })
  }
}

/**
 * Gets assignments for a student (Student only - their enrolled courses).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getStudentAssignmentsList = async (req, res) => {
  const studentId = req.user.id

  try {
    console.log(`🔄 Fetching assignments for student ${studentId}`)

    const assignments = await getStudentAssignments(studentId)
    console.log(`✅ Found ${assignments.length} assignments for student`)

    res.status(200).json({
      assignments,
    })
  } catch (error) {
    console.error("❌ Get student assignments error:", error)
    res.status(500).json({ message: "Server error while fetching student assignments." })
  }
}

/**
 * Gets all assignments (Admin only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getAllAssignmentsAdmin = async (req, res) => {
  try {
    console.log(`🔄 Fetching all assignments (admin)`)

    const assignments = await getAllAssignments()
    console.log(`✅ Found ${assignments.length} total assignments`)

    res.status(200).json({
      assignments,
    })
  } catch (error) {
    console.error("❌ Get all assignments error:", error)
    res.status(500).json({ message: "Server error while fetching all assignments." })
  }
}

/**
 * Gets assignments created by an instructor (Instructor only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getInstructorAssignmentsList = async (req, res) => {
  const instructorId = req.user.id

  try {
    console.log(`🔄 Fetching assignments for instructor ${instructorId}`)

    const assignments = await getInstructorAssignments(instructorId)
    console.log(`✅ Found ${assignments.length} assignments for instructor`)

    res.status(200).json({
      assignments,
    })
  } catch (error) {
    console.error("❌ Get instructor assignments error:", error)
    res.status(500).json({ message: "Server error while fetching instructor assignments." })
  }
}
