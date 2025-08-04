import { create } from "zustand"
import axios from "axios"

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

// Create the dashboard store
const useDashboardStore = create((set) => ({
  // State
  overview: null,
  loading: false,
  error: null,

  // Actions

  /**
   * Gets admin dashboard overview statistics.
   * @returns {Promise<Object>} The admin overview data.
   */
  getAdminOverview: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/admin/overview`)
      set({ overview: response.data.overview, loading: false })
      return response.data.overview
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch admin overview"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets instructor dashboard overview statistics.
   * @returns {Promise<Object>} The instructor overview data.
   */
  getInstructorOverview: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/instructor/overview`)
      set({ overview: response.data.overview, loading: false })
      return response.data.overview
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch instructor overview"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  /**
   * Gets student dashboard overview statistics.
   * @returns {Promise<Object>} The student overview data.
   */
  getStudentOverview: async () => {
    set({ loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/student/overview`)
      set({ overview: response.data.overview, loading: false })
      return response.data.overview
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to fetch student overview"
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  // Utility actions
  clearError: () => set({ error: null }),
  clearOverview: () => set({ overview: null }),
}))

export default useDashboardStore
