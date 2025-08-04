import { create } from "zustand"
import axios from "axios"

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Create the submission store
const useSubmissionStore = create((set, get) => ({
  // State
  submissions: [],
  currentSubmission: null,
  loading: false,
  error: null,

  // Actions

  /**
   * Submits an assignment (Student only).
   * @param {Object} submissionData - Object containing assignment ID and file URL.
   * @returns {Promise<Object>} The submission data.
   */
  submitAssignment: async (submissionData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.post(`${API_BASE_URL}/submissions`, submissionData)
      const submission = response.data.submission

      // Update or add the submission to the submissions list
      set((state) => {
        const existingIndex = state.submissions.findIndex(
          (s) => s.assignment_id === submission.assignment_id && s.student_id === submission.student_id,
        )

        if (existingIndex >= 0) {
          // Update existing submission
          const updatedSubmissions = [...state.submissions]
          updatedSubmissions[existingIndex] = submission
          return { submissions: updatedSubmissions, loading: false }
        } else {
          // Add new submission
          return { submissions: [submission, ...state.submissions], loading: false }
        }
      })

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to submit assignment"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets submissions for a specific assignment (Instructor/Admin only).
   * @param {number} assignmentId - The ID of the assignment.
   * @returns {Promise<Array>} Array of assignment submissions.
   */
  getAssignmentSubmissions: async (assignmentId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/assignment/${assignmentId}`)
      set({ submissions: response.data.submissions, loading: false })
      return response.data.submissions
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch assignment submissions"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets submissions by a student (Student only).
   * @returns {Promise<Array>} Array of student submissions.
   */
  getStudentSubmissions: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/student/list`)
      set({ submissions: response.data.submissions, loading: false })
      return response.data.submissions
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch student submissions"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets a specific submission by ID.
   * @param {number} submissionId - The ID of the submission.
   * @returns {Promise<Object>} The submission data.
   */
  getSubmissionById: async (submissionId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/${submissionId}`)
      set({ currentSubmission: response.data.submission, loading: false })
      return response.data.submission
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch submission"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Grades a submission (Instructor/Admin only).
   * @param {number} submissionId - The ID of the submission to grade.
   * @param {Object} gradeData - Object containing grade and feedback.
   * @returns {Promise<Object>} The graded submission data.
   */
  gradeSubmission: async (submissionId, gradeData) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.put(`${API_BASE_URL}/submissions/${submissionId}/grade`, gradeData)
      const gradedSubmission = response.data.submission

      // Update the submission in the submissions list
      set((state) => ({
        submissions: state.submissions.map((submission) =>
          submission.id === submissionId ? { ...submission, ...gradedSubmission } : submission,
        ),
        currentSubmission:
          state.currentSubmission?.id === submissionId
            ? { ...state.currentSubmission, ...gradedSubmission }
            : state.currentSubmission,
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to grade submission"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Deletes a submission (Student only - own submissions).
   * @param {number} submissionId - The ID of the submission to delete.
   * @returns {Promise<Object>} The response data.
   */
  deleteSubmission: async (submissionId) => {
    set({ loading: true, error: null })
    try {
      const response = await axios.delete(`${API_BASE_URL}/submissions/${submissionId}`)

      // Remove the submission from the submissions list
      set((state) => ({
        submissions: state.submissions.filter((submission) => submission.id !== submissionId),
        currentSubmission: state.currentSubmission?.id === submissionId ? null : state.currentSubmission,
        loading: false,
      }))

      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete submission"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets submissions for courses taught by an instructor.
   * @returns {Promise<Array>} Array of instructor submissions.
   */
  getInstructorSubmissions: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/instructor/list`)
      set({ submissions: response.data.submissions, loading: false })
      return response.data.submissions
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch instructor submissions"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets all submissions (Admin only).
   * @returns {Promise<Array>} Array of all submissions.
   */
  getAllSubmissions: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/admin/all`)
      set({ submissions: response.data.submissions, loading: false })
      return response.data.submissions
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch all submissions"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),
  clearCurrentSubmission: () => set({ currentSubmission: null }),
  clearSubmissions: () => set({ submissions: [], currentSubmission: null }),
}))

export default useSubmissionStore
