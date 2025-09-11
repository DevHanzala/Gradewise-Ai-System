import { create } from "zustand"
import axios from "axios"
import toast from "react-hot-toast"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const useAssessmentStore = create((set) => ({
  assessments: [],
  currentAssessment: null,
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  createAssessment: async (assessmentData) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const formData = new FormData()
      formData.append("title", assessmentData.title)
      formData.append("prompt", assessmentData.prompt)
      formData.append("externalLinks", JSON.stringify(assessmentData.externalLinks))
      formData.append("question_blocks", JSON.stringify(assessmentData.question_blocks))
      formData.append("selected_resources", JSON.stringify(assessmentData.selected_resources))
      if (assessmentData.new_files && assessmentData.new_files.length > 0) {
        assessmentData.new_files.forEach(file => formData.append("new_files", file))
      }

      const response = await axios.post(`${API_URL}/assessments`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
      })

      if (response.data.success) {
        const newAssessment = response.data.data
        console.log(`✅ Created assessment: ID=${newAssessment.id}`)
        set((state) => ({
          assessments: [newAssessment, ...state.assessments],
          loading: false,
        }))
        toast.success("Assessment created successfully!")
        return newAssessment
      } else {
        throw new Error(response.data.message || "Failed to create assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create assessment"
      console.error("❌ Create assessment error:", error)
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  getInstructorAssessments: async () => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await axios.get(`${API_URL}/assessments/instructor`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          assessments: response.data.data || [],
          loading: false,
        })
        return response.data.data
      } else {
        throw new Error(response.data.message || "Failed to fetch assessments")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessments"
      console.error("❌ Get instructor assessments error:", error)
      set({ error: errorMessage, loading: false, assessments: [] })
      toast.error(errorMessage)
      throw error
    }
  },

  getAssessmentById: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await axios.get(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          currentAssessment: response.data.data,
          loading: false,
        })
        return response.data.data
      } else {
        throw new Error(response.data.message || "Failed to fetch assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessment"
      console.error("❌ Get assessment error:", error)
      set({ error: errorMessage, loading: false, currentAssessment: null })
      toast.error(errorMessage)
      throw error
    }
  },

  updateAssessment: async (assessmentId, assessmentData) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const formData = new FormData()
      formData.append("title", assessmentData.title)
      formData.append("prompt", assessmentData.prompt)
      formData.append("externalLinks", JSON.stringify(assessmentData.externalLinks))
      formData.append("question_blocks", JSON.stringify(assessmentData.question_blocks))
      formData.append("selected_resources", JSON.stringify(assessmentData.selected_resources))
      if (assessmentData.new_files && assessmentData.new_files.length > 0) {
        assessmentData.new_files.forEach(file => formData.append("new_files", file))
      }

      const response = await axios.put(`${API_URL}/assessments/${assessmentId}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
      })

      if (response.data.success) {
        const updated = response.data.data
        console.log(`✅ Updated assessment: ID=${assessmentId}`)
        set((state) => ({
          assessments: state.assessments.map(a => a.id === assessmentId ? updated : a),
          currentAssessment: updated,
          loading: false,
        }))
        toast.success("Assessment updated successfully!")
        return updated
      } else {
        throw new Error(response.data.message || "Failed to update assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update assessment"
      console.error("❌ Update assessment error:", error)
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  deleteAssessment: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await axios.delete(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        console.log(`✅ Deleted assessment: ID=${assessmentId}`)
        set((state) => ({
          assessments: state.assessments.filter(a => a.id !== assessmentId),
          currentAssessment: null,
          loading: false,
        }))
        toast.success("Assessment deleted successfully!")
        return true
      } else {
        throw new Error(response.data.message || "Failed to delete assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete assessment"
      console.error("❌ Delete assessment error:", error)
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  clearCurrentAssessment: () => set({ currentAssessment: null }),
}))

export default useAssessmentStore