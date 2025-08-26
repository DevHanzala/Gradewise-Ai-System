import { create } from "zustand"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

/**
 * Assessment Taking Store
 * Manages state for students taking assessments including:
 * - Starting attempts
 * - Saving progress
 * - Submitting assessments
 * - Timer management
 * - Resume functionality
 */
const useAssessmentTakingStore = create((set, get) => ({
  // State
  currentAttempt: null,
  attemptProgress: null,
  timerInfo: null,
  isAttempting: false,
  loading: false,
  error: null,

  // Actions

  /**
   * Start a new assessment attempt
   * @param {number} assessmentId - Assessment ID
   * @returns {Promise<Object>} Attempt data
   */
  startAttempt: async (assessmentId) => {
    try {
      set({ loading: true, error: null })
      console.log(`🚀 Starting assessment attempt for assessment ${assessmentId}`)

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/${assessmentId}/start`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        const attemptData = response.data.data
        set({
          currentAttempt: attemptData,
          isAttempting: true,
          loading: false,
        })
        console.log(`✅ Assessment attempt started:`, attemptData)
        return attemptData
      } else {
        throw new Error(response.data.message || "Failed to start assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to start assessment"
      set({ error: errorMessage, loading: false })
      console.error("❌ Start attempt error:", error)
      throw error
    }
  },

  /**
   * Save progress during assessment (autosave)
   * @param {number} attemptId - Attempt ID
   * @param {Array} answers - Array of student answers
   * @param {number} currentQuestion - Current question number
   * @returns {Promise<boolean>} Success status
   */
  saveProgress: async (attemptId, answers, currentQuestion) => {
    try {
      console.log(`💾 Saving progress for attempt ${attemptId}`)

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/attempt/${attemptId}/save`,
        {
          answers,
          currentQuestion,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        console.log(`✅ Progress saved successfully`)
        return true
      } else {
        throw new Error(response.data.message || "Failed to save progress")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to save progress"
      set({ error: errorMessage })
      console.error("❌ Save progress error:", error)
      throw error
    }
  },

  /**
   * Submit assessment attempt
   * @param {number} attemptId - Attempt ID
   * @param {Array} finalAnswers - Final array of student answers
   * @returns {Promise<Object>} Submission result
   */
  submitAttempt: async (attemptId, finalAnswers) => {
    try {
      set({ loading: true, error: null })
      console.log(`📝 Submitting assessment attempt ${attemptId}`)

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/attempt/${attemptId}/submit`,
        {
          finalAnswers,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        const submissionResult = response.data.data
        set({
          isAttempting: false,
          currentAttempt: null,
          loading: false,
        })
        console.log(`✅ Assessment submitted successfully:`, submissionResult)
        return submissionResult
      } else {
        throw new Error(response.data.message || "Failed to submit assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to submit assessment"
      set({ error: errorMessage, loading: false })
      console.error("❌ Submit attempt error:", error)
      throw error
    }
  },

  /**
   * Get current attempt progress
   * @param {number} attemptId - Attempt ID
   * @returns {Promise<Object>} Progress data
   */
  getProgress: async (attemptId) => {
    try {
      set({ loading: true, error: null })
      console.log(`📊 Getting progress for attempt ${attemptId}`)

      const token = localStorage.getItem("token")
      const response = await axios.get(
        `${API_URL}/assessments/attempt/${attemptId}/progress`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        const progress = response.data.data
        set({
          attemptProgress: progress,
          loading: false,
        })
        console.log(`✅ Progress retrieved successfully:`, progress)
        return progress
      } else {
        throw new Error(response.data.message || "Failed to get progress")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to get progress"
      set({ error: errorMessage, loading: false })
      console.error("❌ Get progress error:", error)
      throw error
    }
  },

  /**
   * Check if assessment can be resumed
   * @param {number} assessmentId - Assessment ID
   * @returns {Promise<Object>} Resume status
   */
  checkResumeStatus: async (assessmentId) => {
    try {
      console.log(`🔄 Checking resume status for assessment ${assessmentId}`)

      const token = localStorage.getItem("token")
      const response = await axios.get(
        `${API_URL}/assessments/${assessmentId}/resume-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        const resumeStatus = response.data.data
        console.log(`✅ Resume status checked:`, resumeStatus)
        return resumeStatus
      } else {
        throw new Error(response.data.message || "Failed to check resume status")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to check resume status"
      set({ error: errorMessage })
      console.error("❌ Check resume status error:", error)
      throw error
    }
  },

  /**
   * Get assessment timer information
   * @param {number} assessmentId - Assessment ID
   * @returns {Promise<Object>} Timer data
   */
  getTimerInfo: async (assessmentId) => {
    try {
      console.log(`⏱️ Getting timer info for assessment ${assessmentId}`)

      const token = localStorage.getItem("token")
      const response = await axios.get(
        `${API_URL}/assessments/${assessmentId}/timer`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (response.data.success) {
        const timerInfo = response.data.data
        set({ timerInfo })
        console.log(`✅ Timer info retrieved:`, timerInfo)
        return timerInfo
      } else {
        throw new Error(response.data.message || "Failed to get timer info")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to get timer info"
      set({ error: errorMessage })
      console.error("❌ Get timer info error:", error)
      throw error
    }
  },

  /**
   * Clear current attempt data
   */
  clearAttempt: () => {
    set({
      currentAttempt: null,
      attemptProgress: null,
      timerInfo: null,
      isAttempting: false,
      error: null,
    })
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),
}))

export default useAssessmentTakingStore
