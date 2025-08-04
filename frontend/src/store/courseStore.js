import { create } from "zustand"
import axios from "axios"

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Create the course store
const useCourseStore = create((set, get) => ({
  // State
  courses: [],
  currentCourse: null,
  enrolledStudents: [],
  loading: false,
  error: null,

  // Actions

  /**
   * Creates a new course (Instructor only).
   * @param {Object} courseData - Object containing course title and description.
   * @returns {Promise<Object>} The created course data.
   */
  createCourse: async (courseData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/courses`, courseData)
      const newCourse = response.data.course

      // Add the new course to the courses list
      set((state) => ({
        courses: [newCourse, ...state.courses],
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create course"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Fetches courses for the authenticated instructor.
   * @returns {Promise<Array>} Array of instructor's courses.
   */
  getInstructorCourses: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/courses/instructor`)
      set({ courses: response.data.courses, loading: false })
      return response.data.courses
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch courses"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Fetches a specific course by ID.
   * @param {number} courseId - The ID of the course to fetch.
   * @returns {Promise<Object>} The course data.
   */
  getCourseById: async (courseId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/courses/${courseId}`)
      set({ currentCourse: response.data.course, loading: false })
      return response.data.course
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch course"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Updates an existing course.
   * @param {number} courseId - The ID of the course to update.
   * @param {Object} courseData - Object containing updated course data.
   * @returns {Promise<Object>} The updated course data.
   */
  updateCourse: async (courseId, courseData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.put(`${API_BASE_URL}/courses/${courseId}`, courseData)
      const updatedCourse = response.data.course

      // Update the course in the courses list
      set((state) => ({
        courses: state.courses.map((course) => (course.id === courseId ? updatedCourse : course)),
        currentCourse: state.currentCourse?.id === courseId ? updatedCourse : state.currentCourse,
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update course"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Deletes a course.
   * @param {number} courseId - The ID of the course to delete.
   * @returns {Promise<Object>} The response data.
   */
  deleteCourse: async (courseId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.delete(`${API_BASE_URL}/courses/${courseId}`)

      // Remove the course from the courses list
      set((state) => ({
        courses: state.courses.filter((course) => course.id !== courseId),
        currentCourse: state.currentCourse?.id === courseId ? null : state.currentCourse,
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete course"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Enrolls a student in a course.
   * @param {number} courseId - The ID of the course.
   * @param {string} studentEmail - The email of the student to enroll.
   * @returns {Promise<Object>} The enrollment data.
   */
  enrollStudent: async (courseId, studentEmail) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/courses/${courseId}/enroll`, {
        studentEmail,
      })

      // Refresh enrolled students list if we're viewing this course
      if (get().currentCourse?.id === courseId) {
        await get().getCourseStudents(courseId)
      }

      set({ loading: false })
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to enroll student"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets enrolled students for a course.
   * @param {number} courseId - The ID of the course.
   * @returns {Promise<Array>} Array of enrolled students.
   */
  getCourseStudents: async (courseId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/courses/${courseId}/students`)
      set({ enrolledStudents: response.data.students, loading: false })
      return response.data.students
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch course students"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets courses a student is enrolled in.
   * @returns {Promise<Array>} Array of enrolled courses.
   */
  getStudentCourses: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/courses/student/enrolled`)
      set({ courses: response.data.courses, loading: false })
      return response.data.courses
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch enrolled courses"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets all courses (Admin only).
   * @returns {Promise<Array>} Array of all courses.
   */
  getAllCourses: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/courses/admin/all`)
      set({ courses: response.data.courses, loading: false })
      return response.data.courses
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch all courses"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Removes a student from a course.
   * @param {number} courseId - The ID of the course.
   * @param {number} studentId - The ID of the student to remove.
   * @returns {Promise<Object>} The response data.
   */
  unenrollStudent: async (courseId, studentId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.delete(`${API_BASE_URL}/courses/${courseId}/students/${studentId}`)

      // Remove student from enrolled students list
      set((state) => ({
        enrolledStudents: state.enrolledStudents.filter((student) => student.id !== studentId),
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to unenroll student"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),
  clearCurrentCourse: () => set({ currentCourse: null }),
  clearCourses: () => set({ courses: [], currentCourse: null, enrolledStudents: [] }),
}))

export default useCourseStore
