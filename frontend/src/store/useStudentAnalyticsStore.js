import { create } from "zustand";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const useStudentAnalyticsStore = create((set, get) => ({
  analytics: null,
  performance: [],
  recommendations: null,
  assessments: [],
  selectedAssessment: null,
  selectedAssessmentDetails: null,
  loading: false,
  error: null,

  fetchOverview: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/student-analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ analytics: response.data.data || {} });
      } else {
        throw new Error(response.data.message || "Failed to fetch overview");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch overview";
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  fetchPerformance: async (timeRange = "month") => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/student-analytics/performance?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ performance: response.data.data.performance_data || [] });
      } else {
        throw new Error(response.data.message || "Failed to fetch performance data");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch performance data";
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  fetchRecommendations: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/student-analytics/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ recommendations: response.data.data || { weak_areas: [], study_plan: {} } });
      } else {
        throw new Error(response.data.message || "Failed to fetch recommendations");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch recommendations";
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  fetchAssessments: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/student-analytics/assessments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ assessments: response.data.data || [] });
      } else {
        throw new Error(response.data.message || "Failed to fetch assessments");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessments";
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  fetchAssessmentDetails: async (id) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/student-analytics/assessment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ selectedAssessmentDetails: response.data.data || {} });
      } else {
        throw new Error(response.data.message || "Failed to fetch assessment details");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessment details";
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  setSelectedAssessment: (id) => {
    set({ selectedAssessment: id });
    if (id) {
      get().fetchAssessmentDetails(id);
    } else {
      set({ selectedAssessmentDetails: null });
    }
  },

  downloadReport: async (assessmentId = null) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      let url = `${API_URL}/student-analytics/report?format=csv`;
      if (assessmentId) {
        url += `&assessmentId=${assessmentId}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `student-report${assessmentId ? `-${assessmentId}` : ''}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to download report";
      set({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useStudentAnalyticsStore;