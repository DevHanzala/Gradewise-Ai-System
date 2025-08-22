import { create } from "zustand"
import axios from "axios"
import toast from "react-hot-toast"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const useQuestionStore = create((set, get) => ({
  // State
  questions: [],
  generatedQuestions: [],
  currentQuestions: null,
  loading: false,
  generating: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Generate Questions for Assessment
  generateQuestions: async (assessmentId) => {
    try {
      set({ generating: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/questions/assessments/${assessmentId}/generate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success) {
        const generatedData = response.data.data
        set((state) => ({
          generatedQuestions: generatedData.generated_blocks || [],
          generating: false,
        }))

        toast.success(
          `✅ Generated ${generatedData.total_questions} questions across ${generatedData.generated_blocks.length} blocks!`,
        )
        return generatedData
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to generate questions"
      set({ error: errorMessage, generating: false })
      toast.error(`❌ ${errorMessage}`)
      throw error
    }
  },

  // Get Generated Questions for Assessment
  getGeneratedQuestions: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/questions/assessments/${assessmentId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          generatedQuestions: response.data.data.question_blocks || [],
          loading: false,
        })
        return response.data.data.question_blocks || []
      }
    } catch (error) {
      // Questions might not exist yet, that's okay
      set({ loading: false, generatedQuestions: [] })
      return []
    }
  },

  // Regenerate Questions for Specific Block
  regenerateBlock: async (assessmentId, blockTitle) => {
    try {
      set({ generating: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/questions/assessments/${assessmentId}/blocks/${encodeURIComponent(blockTitle)}/regenerate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success) {
        // Update the specific block in generatedQuestions
        set((state) => ({
          generatedQuestions: state.generatedQuestions.map((block) =>
            block.block_title === blockTitle
              ? {
                  ...block,
                  questions: response.data.data.questions,
                  generated_at: new Date().toISOString(),
                }
              : block,
          ),
          generating: false,
        }))

        toast.success(`✅ Regenerated questions for ${blockTitle}!`)
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to regenerate questions"
      set({ error: errorMessage, generating: false })
      toast.error(`❌ ${errorMessage}`)
      throw error
    }
  },

  // Get Questions by Block
  getQuestionsByBlock: async (assessmentId, blockTitle) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(
        `${API_URL}/questions/assessments/${assessmentId}/blocks/${encodeURIComponent(blockTitle)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success) {
        set({ loading: false })
        return response.data.data.questions || []
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch questions"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  // Get All Questions for Assessment (for student taking)
  getAssessmentQuestions: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/questions/assessments/${assessmentId}/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          currentQuestions: response.data.data,
          loading: false,
        })
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch assessment questions"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  // Clear Questions Data
  clearQuestions: () =>
    set({
      questions: [],
      generatedQuestions: [],
      currentQuestions: null,
      loading: false,
      generating: false,
      error: null,
    }),

  // Clear Generated Questions
  clearGeneratedQuestions: () => set({ generatedQuestions: [] }),
}))

export default useQuestionStore
