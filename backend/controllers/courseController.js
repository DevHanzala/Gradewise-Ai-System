import {
  createCourse,
  findCoursesByInstructor,
  findCourseById,
  updateCourse,
  deleteCourse,
  enrollStudent,
  getEnrolledStudents,
  getStudentCourses,
  getAllCourses,
  unenrollStudent,
  isStudentEnrolled,
} from "../models/courseModel.js"
import { findUserByEmail } from "../models/userModel.js"

/**
 * Creates a new course (Instructor only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const createNewCourse = async (req, res) => {
  const { title, description } = req.body
  const instructorId = req.user.id // Get instructor ID from authenticated user

  try {
    console.log(`🔄 Creating new course: ${title} by instructor ${instructorId}`)

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." })
    }

    // Create the course
    const newCourse = await createCourse(title, description, instructorId)
    console.log(`✅ Course created successfully:`, newCourse)

    res.status(201).json({
      message: "Course created successfully.",
      course: newCourse,
    })
  } catch (error) {
    console.error("❌ Create course error:", error)
    res.status(500).json({ message: "Server error while creating course." })
  }
}

/**
 * Gets courses for the authenticated instructor.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getInstructorCourses = async (req, res) => {
  const instructorId = req.user.id

  try {
    console.log(`🔄 Fetching courses for instructor ${instructorId}`)

    const courses = await findCoursesByInstructor(instructorId)
    console.log(`✅ Found ${courses.length} courses for instructor`)

    res.status(200).json({
      courses,
    })
  } catch (error) {
    console.error("❌ Get instructor courses error:", error)
    res.status(500).json({ message: "Server error while fetching courses." })
  }
}

/**
 * Gets a specific course by ID (with authorization check).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getCourseById = async (req, res) => {
  const { courseId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Fetching course ${courseId} for user ${userId} (${userRole})`)

    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    // Authorization check
    if (userRole === "student") {
      // Students can only view courses they're enrolled in
      const isEnrolled = await isStudentEnrolled(userId, courseId)
      if (!isEnrolled) {
        return res.status(403).json({ message: "You are not enrolled in this course." })
      }
    } else if (userRole === "instructor" && course.instructor_id !== userId) {
      // Instructors can only view their own courses
      return res.status(403).json({ message: "You can only view your own courses." })
    }
    // Admins can view any course

    console.log(`✅ Course found:`, course)

    res.status(200).json({
      course,
    })
  } catch (error) {
    console.error("❌ Get course by ID error:", error)
    res.status(500).json({ message: "Server error while fetching course." })
  }
}

/**
 * Updates a course (Instructor only - own courses).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const updateExistingCourse = async (req, res) => {
  const { courseId } = req.params
  const { title, description } = req.body
  const instructorId = req.user.id

  try {
    console.log(`🔄 Updating course ${courseId} by instructor ${instructorId}`)

    // Check if course exists and belongs to the instructor
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    if (course.instructor_id !== instructorId) {
      return res.status(403).json({ message: "You can only update your own courses." })
    }

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." })
    }

    // Update the course
    const updatedCourse = await updateCourse(courseId, title, description)
    console.log(`✅ Course updated successfully:`, updatedCourse)

    res.status(200).json({
      message: "Course updated successfully.",
      course: updatedCourse,
    })
  } catch (error) {
    console.error("❌ Update course error:", error)
    res.status(500).json({ message: "Server error while updating course." })
  }
}

/**
 * Deletes a course (Instructor only - own courses).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const deleteExistingCourse = async (req, res) => {
  const { courseId } = req.params
  const instructorId = req.user.id

  try {
    console.log(`🔄 Deleting course ${courseId} by instructor ${instructorId}`)

    // Check if course exists and belongs to the instructor
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    if (course.instructor_id !== instructorId) {
      return res.status(403).json({ message: "You can only delete your own courses." })
    }

    // Delete the course
    const deletedCourse = await deleteCourse(courseId)
    console.log(`✅ Course deleted successfully:`, deletedCourse)

    res.status(200).json({
      message: "Course deleted successfully.",
      course: deletedCourse,
    })
  } catch (error) {
    console.error("❌ Delete course error:", error)
    res.status(500).json({ message: "Server error while deleting course." })
  }
}

/**
 * Enrolls a student in a course (Admin/Instructor only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const enrollStudentInCourse = async (req, res) => {
  const { courseId } = req.params
  const { studentEmail } = req.body
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Enrolling student ${studentEmail} in course ${courseId}`)

    // Find the student by email
    const student = await findUserByEmail(studentEmail)
    if (!student) {
      return res.status(404).json({ message: "Student not found." })
    }

    if (student.role !== "student") {
      return res.status(400).json({ message: "User is not a student." })
    }

    // Check if course exists
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    // Authorization check
    if (userRole === "instructor" && course.instructor_id !== userId) {
      return res.status(403).json({ message: "You can only enroll students in your own courses." })
    }

    // Check if student is already enrolled
    const alreadyEnrolled = await isStudentEnrolled(student.id, courseId)
    if (alreadyEnrolled) {
      return res.status(400).json({ message: "Student is already enrolled in this course." })
    }

    // Enroll the student
    const enrollment = await enrollStudent(student.id, courseId)
    console.log(`✅ Student enrolled successfully:`, enrollment)

    res.status(201).json({
      message: "Student enrolled successfully.",
      enrollment: {
        ...enrollment,
        student_name: student.name,
        student_email: student.email,
        course_title: course.title,
      },
    })
  } catch (error) {
    console.error("❌ Enroll student error:", error)
    res.status(500).json({ message: "Server error while enrolling student." })
  }
}

/**
 * Gets enrolled students for a course (Instructor/Admin only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getCourseStudents = async (req, res) => {
  const { courseId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Fetching students for course ${courseId}`)

    // Check if course exists
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    // Authorization check
    if (userRole === "instructor" && course.instructor_id !== userId) {
      return res.status(403).json({ message: "You can only view students in your own courses." })
    }

    // Get enrolled students
    const students = await getEnrolledStudents(courseId)
    console.log(`✅ Found ${students.length} enrolled students`)

    res.status(200).json({
      students,
      course: {
        id: course.id,
        title: course.title,
        instructor_name: course.instructor_name,
      },
    })
  } catch (error) {
    console.error("❌ Get course students error:", error)
    res.status(500).json({ message: "Server error while fetching course students." })
  }
}

/**
 * Gets courses for a student (Student only - their own courses).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getStudentEnrolledCourses = async (req, res) => {
  const studentId = req.user.id

  try {
    console.log(`🔄 Fetching enrolled courses for student ${studentId}`)

    const courses = await getStudentCourses(studentId)
    console.log(`✅ Found ${courses.length} enrolled courses for student`)

    res.status(200).json({
      courses,
    })
  } catch (error) {
    console.error("❌ Get student courses error:", error)
    res.status(500).json({ message: "Server error while fetching student courses." })
  }
}

/**
 * Gets all courses (Admin only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const getAllCoursesAdmin = async (req, res) => {
  try {
    console.log(`🔄 Fetching all courses (admin)`)

    const courses = await getAllCourses()
    console.log(`✅ Found ${courses.length} total courses`)

    res.status(200).json({
      courses,
    })
  } catch (error) {
    console.error("❌ Get all courses error:", error)
    res.status(500).json({ message: "Server error while fetching all courses." })
  }
}

/**
 * Removes a student from a course (Admin/Instructor only).
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 */
export const unenrollStudentFromCourse = async (req, res) => {
  const { courseId, studentId } = req.params
  const userId = req.user.id
  const userRole = req.user.role

  try {
    console.log(`🔄 Unenrolling student ${studentId} from course ${courseId}`)

    // Check if course exists
    const course = await findCourseById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found." })
    }

    // Authorization check
    if (userRole === "instructor" && course.instructor_id !== userId) {
      return res.status(403).json({ message: "You can only manage students in your own courses." })
    }

    // Check if student is enrolled
    const isEnrolled = await isStudentEnrolled(studentId, courseId)
    if (!isEnrolled) {
      return res.status(400).json({ message: "Student is not enrolled in this course." })
    }

    // Unenroll the student
    const unenrollment = await unenrollStudent(studentId, courseId)
    console.log(`✅ Student unenrolled successfully:`, unenrollment)

    res.status(200).json({
      message: "Student unenrolled successfully.",
      unenrollment,
    })
  } catch (error) {
    console.error("❌ Unenroll student error:", error)
    res.status(500).json({ message: "Server error while unenrolling student." })
  }
}
