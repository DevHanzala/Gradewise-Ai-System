import { create } from "zustand"
import axios from "axios"
import toast from "react-hot-toast"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const useAssessmentStore = create((set, get) => ({
  // State
  assessments: [],
  studentAssessments: [],
  currentAssessment: null,
  enrolledStudents: [],
  loading: false,
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Create Assessment
  createAssessment: async (assessmentData) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(`${API_URL}/assessments`, assessmentData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set((state) => ({
          assessments: [response.data.data, ...state.assessments],
          loading: false,
        }))
        toast.success("Assessment created successfully!")
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create assessment"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Get Instructor Assessments
  getInstructorAssessments: async () => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/instructor`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          assessments: response.data.data || [],
          loading: false,
        })
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch assessments"
      set({ error: errorMessage, loading: false, assessments: [] })
      console.error("Get instructor assessments error:", error)
      throw error
    }
  },

  // Get Student Assessments
  getStudentAssessments: async () => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/student/enrolled`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          studentAssessments: response.data.data || [],
          loading: false,
        })
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch student assessments"
      set({ error: errorMessage, loading: false, studentAssessments: [] })
      console.error("Get student assessments error:", error)
      throw error
    }
  },

  // Get Assessment by ID
  getAssessmentById: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          currentAssessment: response.data.data,
          loading: false,
        })
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch assessment"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Update Assessment
  updateAssessment: async (assessmentId, updateData) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.put(`${API_URL}/assessments/${assessmentId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set((state) => ({
          assessments: state.assessments.map((assessment) =>
            assessment.id === assessmentId ? response.data.data : assessment,
          ),
          currentAssessment: response.data.data,
          loading: false,
        }))
        toast.success("Assessment updated successfully!")
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update assessment"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Delete Assessment
  deleteAssessment: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.delete(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set((state) => ({
          assessments: state.assessments.filter((assessment) => assessment.id !== assessmentId),
          loading: false,
        }))
        toast.success("Assessment deleted successfully!")
        return true
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to delete assessment"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Enroll Student
  enrollStudent: async (assessmentId, studentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/${assessmentId}/enroll`,
        {
          studentId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success) {
        get().getEnrolledStudents(assessmentId)
        set({ loading: false })
        toast.success("Student enrolled successfully!")
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to enroll student"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Get Enrolled Students
  getEnrolledStudents: async (assessmentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          enrolledStudents: response.data.data || [],
          loading: false,
        })
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch enrolled students"
      set({ error: errorMessage, loading: false, enrolledStudents: [] })
      console.error("Get enrolled students error:", error)
      throw error
    }
  },

  // Unenroll Student
  unenrollStudent: async (assessmentId, studentId) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.delete(`${API_URL}/assessments/${assessmentId}/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        get().getEnrolledStudents(assessmentId)
        set({ loading: false })
        toast.success("Student unenrolled successfully!")
        return true
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to unenroll student"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Get all assessments (admin only)
  getAllAssessments: async () => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        set({
          assessments: response.data.data || [],
          loading: false,
        })
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch all assessments"
      set({ error: errorMessage, loading: false, assessments: [] })
      console.error("Get all assessments error:", error)
      throw error
    }
  },

  // Clear current assessment
  clearCurrentAssessment: () => set({ currentAssessment: null }),

  // Clear assessments
  clearAssessmentData: () =>
    set({
      assessments: [],
      studentAssessments: [],
      currentAssessment: null,
      enrolledStudents: [],
      loading: false,
      error: null,
    }),
}))

export default useAssessmentStore
