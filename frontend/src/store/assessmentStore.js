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
  assessmentLoading: false, // Added missing state
  questionLoading: false,   // Added missing state
  error: null,

  // Actions
  setLoading: (loading) => set({ loading }),
  setAssessmentLoading: (loading) => set({ assessmentLoading: loading }), // Added action
  setQuestionLoading: (loading) => set({ questionLoading: loading }),     // Added action
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Create Assessment
  createAssessment: async (assessmentData) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      console.log("🚀 Creating assessment with data:", assessmentData)
      
      const response = await axios.post(`${API_URL}/assessments`, assessmentData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("📡 API Response:", response.data)

      if (response.data.success) {
        const newAssessment = response.data.data
        
        // Add the new assessment to the beginning of the list
        set((state) => ({
          assessments: [newAssessment, ...state.assessments],
          loading: false,
        }))
        
        toast.success("Assessment created successfully!")
        console.log("✅ Assessment created and added to store:", newAssessment)
        
        // Force a refresh of the assessments list to ensure consistency
        setTimeout(() => {
          get().getInstructorAssessments()
        }, 500)
        
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

  // Get Instructor Assessments
  getInstructorAssessments: async () => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      console.log("📋 Fetching instructor assessments...")
      
      const response = await axios.get(`${API_URL}/assessments/instructor`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("📡 Instructor assessments response:", response.data)

      if (response.data.success) {
        const assessments = response.data.data || []
        console.log(`✅ Found ${assessments.length} assessments`)
        
        set({
          assessments: assessments,
          loading: false,
        })
        return assessments
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

  // Student Assessments
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
    } else {
      throw new Error(response.data.message || "Failed to fetch student assessments")
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    set({ error: errorMessage, loading: false, studentAssessments: [] })
    console.error("Get student assessments error:", errorMessage)
    throw error
  }
},


  // Get Assessment by ID
  getAssessmentById: async (assessmentId) => {
    try {
      console.log("🔍 getAssessmentById: Starting to fetch assessment", assessmentId)
      set({ assessmentLoading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("📡 getAssessmentById: API Response:", response.data)

      if (response.data.success) {
        const assessmentData = response.data.data
        console.log("✅ getAssessmentById: Setting currentAssessment:", assessmentData)
        
        set({
          currentAssessment: assessmentData,
          assessmentLoading: false,
        })
        
        console.log("✅ getAssessmentById: Store updated successfully")
        return assessmentData
      } else {
        throw new Error(response.data.message || "Failed to fetch assessment")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessment"
      console.error("❌ getAssessmentById: Error:", errorMessage)
      set({ error: errorMessage, assessmentLoading: false })
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

  // Enroll Student by Email (single)
  enrollStudent: async (assessmentId, email) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/${assessmentId}/enroll`,
        {
          // Backend expects { email }
          email,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success || response.data.message === "Student enrolled successfully") {
        // Refresh enrolled students list
        await get().getEnrolledStudents(assessmentId)
        set({ loading: false })
        toast.success("Student enrolled successfully!")
        return response.data.data || true
      } else {
        throw new Error(response.data.message || "Failed to enroll student")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to enroll student"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Enroll Students by Email (Bulk)
  enrollStudentsByEmail: async (assessmentId, emails) => {
    try {
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.post(
        `${API_URL}/assessments/${assessmentId}/enroll-bulk`,
        {
          emails,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.data.success) {
        // Refresh enrolled students list
        await get().getEnrolledStudents(assessmentId)
        set({ loading: false })
        toast.success(`Successfully enrolled ${emails.length} student(s)!`)
        return response.data.data
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to enroll students"
      set({ error: errorMessage, loading: false })
      toast.error(errorMessage)
      throw error
    }
  },

  // Get Enrolled Students
  getEnrolledStudents: async (assessmentId) => {
    try {
      console.log(`🔍 getEnrolledStudents: Starting to fetch enrolled students for assessment ${assessmentId}`)
      set({ loading: true, error: null })

      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log(`📡 getEnrolledStudents: API Response:`, response.data)

      if (response.data.success) {
        console.log(`✅ getEnrolledStudents: Setting enrolled students:`, response.data.data)
        set({
          enrolledStudents: response.data.data || [],
          loading: false,
        })
        return response.data.data
      } else {
        console.log(`❌ getEnrolledStudents: Response not successful:`, response.data)
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch enrolled students"
      console.error(`❌ getEnrolledStudents: Error:`, error)
      set({ error: errorMessage, loading: false, enrolledStudents: [] })
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
        await get().getEnrolledStudents(assessmentId)
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
      assessmentLoading: false, // Added missing state
      questionLoading: false,   // Added missing state
      error: null,
    }),
}))

export default useAssessmentStore
