import { create } from "zustand"
import axios from "axios"

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Create the assignment store
const useAssignmentStore = create((set, get) => ({
  // State
  assignments: [],
  currentAssignment: null,
  loading: false,
  error: null,

  // Actions

  /**
   * Creates a new assignment.
   * @param {Object} assignmentData - Object containing assignment details.
   * @returns {Promise<Object>} The created assignment data.
   */
  createAssignment: async (assignmentData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/assignments`, assignmentData)
      const newAssignment = response.data.assignment

      // Add the new assignment to the assignments list
      set((state) => ({
        assignments: [newAssignment, ...state.assignments],
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create assignment"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Fetches assignments for a specific course.
   * @param {number} courseId - The ID of the course.
   * @returns {Promise<Array>} Array of course assignments.
   */
  getCourseAssignments: async (courseId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/assignments/course/${courseId}`)
      set({ assignments: response.data.assignments, loading: false })
      return response.data.assignments
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch course assignments"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Fetches a specific assignment by ID.
   * @param {number} assignmentId - The ID of the assignment to fetch.
   * @returns {Promise<Object>} The assignment data.
   */
  getAssignmentById: async (assignmentId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/assignments/${assignmentId}`)
      set({ currentAssignment: response.data.assignment, loading: false })
      return response.data.assignment
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch assignment"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Updates an existing assignment.
   * @param {number} assignmentId - The ID of the assignment to update.
   * @param {Object} assignmentData - Object containing updated assignment data.
   * @returns {Promise<Object>} The updated assignment data.
   */
  updateAssignment: async (assignmentId, assignmentData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.put(`${API_BASE_URL}/assignments/${assignmentId}`, assignmentData)
      const updatedAssignment = response.data.assignment

      // Update the assignment in the assignments list
      set((state) => ({
        assignments: state.assignments.map((assignment) =>
          assignment.id === assignmentId ? updatedAssignment : assignment,
        ),
        currentAssignment: state.currentAssignment?.id === assignmentId ? updatedAssignment : state.currentAssignment,
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update assignment"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Deletes an assignment.
   * @param {number} assignmentId - The ID of the assignment to delete.
   * @returns {Promise<Object>} The response data.
   */
  deleteAssignment: async (assignmentId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.delete(`${API_BASE_URL}/assignments/${assignmentId}`)

      // Remove the assignment from the assignments list
      set((state) => ({
        assignments: state.assignments.filter((assignment) => assignment.id !== assignmentId),
        currentAssignment: state.currentAssignment?.id === assignmentId ? null : state.currentAssignment,
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete assignment"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets assignments for a student (their enrolled courses).
   * @returns {Promise<Array>} Array of student assignments.
   */
  getStudentAssignments: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/assignments/student/list`)
      set({ assignments: response.data.assignments, loading: false })
      return response.data.assignments
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch student assignments"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets assignments created by an instructor.
   * @returns {Promise<Array>} Array of instructor assignments.
   */
  getInstructorAssignments: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/assignments/instructor/list`)
      set({ assignments: response.data.assignments, loading: false })
      return response.data.assignments
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch instructor assignments"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets all assignments (Admin only).
   * @returns {Promise<Array>} Array of all assignments.
   */
  getAllAssignments: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/assignments/admin/all`)
      set({ assignments: response.data.assignments, loading: false })
      return response.data.assignments
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch all assignments"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),
  clearCurrentAssignment: () => set({ currentAssignment: null }),
  clearAssignments: () => set({ assignments: [], currentAssignment: null }),
}))

export default useAssignmentStore
