// Explanation: Simplified to fetch instructor overview with updated stats (e.g., own assessments count, resources count, executed assessments). Removed admin/student overviews if not needed.
import { create } from "zustand"
import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const useDashboardStore = create((set) => ({
  overview: null,
  loading: false,
  error: null,

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

  clearError: () => set({ error: null }),
  clearOverview: () => set({ overview: null }),
}))

export default useDashboardStore