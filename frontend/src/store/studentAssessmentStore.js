import { create } from "zustand"
import axios from "axios"
import toast from "react-hot-toast"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const useStudentAssessmentStore = create((set, get) => ({
  // State
  currentAssessment: null,
  assessmentQuestions: [],
  currentAnswers: {},
  flaggedQuestions: new Set(),
  timeRemaining: 0,
  currentQuestionIndex: 0,
  isSubmitted: false,
  loading: false,
  submitting: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setSubmitting: (submitting) => set({ submitting }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Start Assessment
  startAssessment: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/${assessmentId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        const { assessment, questions } = response.data.data

        set({
          currentAssessment: assessment,
          assessmentQuestions: questions,
          timeRemaining: assessment.duration * 60, // Convert to seconds
          currentAnswers: {},
          flaggedQuestions: new Set(),
          currentQuestionIndex: 0,
          isSubmitted: false,
          loading: false,
        })

        return { assessment, questions }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to start assessment"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Save Progress
  saveProgress: async (assessmentId) => {
    try {
      const { currentAnswers, flaggedQuestions } = get()
      const token = localStorage.getItem("token")

      await axios.post(
        `${API_URL}/assessments/student/${assessmentId}/progress`,
        {
          answers: currentAnswers,
          flagged_questions: Array.from(flaggedQuestions),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
    } catch (error) {
      console.error("Failed to save progress:", error)
    }
  },

  // Submit Assessment
  submitAssessment: async (assessmentId) => {
    try {
      set({ submitting: true, error: null })

      const { currentAnswers, flaggedQuestions } = get()
      const token = localStorage.getItem("token")

      const response = await axios.post(
        `${API_URL}/assessments/student/${assessmentId}/submit`,
        {
          answers: currentAnswers,
          flagged_questions: Array.from(flaggedQuestions),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success) {
        set({
          isSubmitted: true,
          submitting: false,
        })

        toast.success("Assessment submitted successfully!")
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to submit assessment"
      set({ error: errorMessage, submitting: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Update Answer
  updateAnswer: (questionId, answer) => {
    set((state) => ({
      currentAnswers: {
        ...state.currentAnswers,
        [questionId]: answer,
      },
    }))

    // Auto-save progress
    const { currentAssessment } = get()
    if (currentAssessment) {
      get().saveProgress(currentAssessment.id)
    }
  },

  // Toggle Flag Question
  toggleFlagQuestion: (questionId) => {
    set((state) => {
      const newFlagged = new Set(state.flaggedQuestions)
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId)
      } else {
        newFlagged.add(questionId)
      }
      return { flaggedQuestions: newFlagged }
    })

    // Auto-save progress
    const { currentAssessment } = get()
    if (currentAssessment) {
      get().saveProgress(currentAssessment.id)
    }
  },

  // Navigate Questions
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

  nextQuestion: () => {
    set((state) => ({
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.assessmentQuestions.length - 1),
    }))
  },

  previousQuestion: () => {
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    }))
  },

  // Timer Management
  setTimeRemaining: (time) => set({ timeRemaining: time }),

  decrementTime: () => {
    set((state) => {
      const newTime = Math.max(state.timeRemaining - 1, 0)

      // Auto-submit when time runs out
      if (newTime === 0 && !state.isSubmitted && state.currentAssessment) {
        get().submitAssessment(state.currentAssessment.id)
      }

      return { timeRemaining: newTime }
    })
  },

  // Clear Assessment Data
  clearAssessmentData: () =>
    set({
      currentAssessment: null,
      assessmentQuestions: [],
      currentAnswers: {},
      flaggedQuestions: new Set(),
      timeRemaining: 0,
      currentQuestionIndex: 0,
      isSubmitted: false,
      loading: false,
      submitting: false,
      error: null,
    }),
}))

export default useStudentAssessmentStore
