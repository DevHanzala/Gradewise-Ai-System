import { create } from "zustand";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const useAssessmentStore = create((set) => ({
  assessments: [],
  studentAssessments: [],
  getStudentAssessments: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/taking/assessments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ studentAssessments: response.data.data || [], loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch student assessments";
      set({ error: errorMessage, loading: false, studentAssessments: [] });
      toast.error(errorMessage);
      throw error;
    }
  },
  currentAssessment: null,
  enrolledStudents: [],
  loading: false,
  error: null,

  getInstructorAssessments: async () => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/assessments/instructor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ assessments: response.data.data, loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessments";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  getAssessmentById: async (assessmentId) => {
    set({ loading: true, error: null });
    try {
      if (!assessmentId || isNaN(parseInt(assessmentId))) {
        throw new Error("Invalid assessment ID");
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/assessments/${parseInt(assessmentId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ currentAssessment: response.data.data, loading: false });
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessment";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  createAssessment: async (assessmentData) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const formData = new FormData();
      formData.append("title", assessmentData.title);
      formData.append("prompt", assessmentData.prompt);
      console.log(`🔍 Sending externalLinks to backend:`, assessmentData.externalLinks);
      formData.append("externalLinks", JSON.stringify(assessmentData.externalLinks));
      formData.append("question_blocks", JSON.stringify(assessmentData.question_blocks));
      const validSelectedResources = assessmentData.selected_resources.filter(id => id && !isNaN(id));
      formData.append("selected_resources", JSON.stringify(validSelectedResources));
      assessmentData.new_files?.forEach((file) => {
        formData.append("new_files", file);
      });

      const response = await axios.post(`${API_URL}/assessments`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        set((state) => ({
          assessments: [...state.assessments, response.data.data],
          loading: false,
        }));
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create assessment";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  updateAssessment: async (assessmentId, assessmentData) => {
    set({ loading: true, error: null });
    try {
      if (!assessmentId || isNaN(parseInt(assessmentId))) {
        throw new Error("Invalid assessment ID");
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const formData = new FormData();
      formData.append("title", assessmentData.title);
      formData.append("prompt", assessmentData.prompt);
      console.log(`🔍 Sending externalLinks to backend:`, assessmentData.externalLinks);
      formData.append("externalLinks", JSON.stringify(assessmentData.externalLinks));
      formData.append("question_blocks", JSON.stringify(assessmentData.question_blocks));
      const validSelectedResources = assessmentData.selected_resources.filter(id => id && !isNaN(id));
      formData.append("selected_resources", JSON.stringify(validSelectedResources));
      assessmentData.new_files?.forEach((file) => {
        formData.append("new_files", file);
      });

      const response = await axios.put(`${API_URL}/assessments/${parseInt(assessmentId)}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        set((state) => ({
          assessments: state.assessments.map((assessment) =>
            assessment.id === assessmentId ? response.data.data : assessment
          ),
          currentAssessment: response.data.data,
          loading: false,
        }));
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update assessment";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  deleteAssessment: async (assessmentId) => {
    set({ loading: true, error: null });
    try {
      if (!assessmentId || isNaN(parseInt(assessmentId))) {
        throw new Error("Invalid assessment ID");
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.delete(`${API_URL}/assessments/${parseInt(assessmentId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set((state) => ({
          assessments: state.assessments.filter((assessment) => assessment.id !== Number.parseInt(assessmentId)),
          loading: false,
        }));
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete assessment";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  getEnrolledStudents: async (assessmentId) => {
    set({ loading: true, error: null });
    try {
      if (!assessmentId || isNaN(parseInt(assessmentId))) {
        throw new Error("Invalid assessment ID");
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/assessments/${parseInt(assessmentId)}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ enrolledStudents: response.data.data, loading: false });
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to fetch enrolled students";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  enrollStudent: async (assessmentId, email) => {
    set({ loading: true, error: null });
    try {
      if (!assessmentId || isNaN(parseInt(assessmentId))) {
        throw new Error("Invalid assessment ID");
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.post(
        `${API_URL}/assessments/${parseInt(assessmentId)}/enroll`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        set((state) => ({
          enrolledStudents: [...state.enrolledStudents, response.data.data],
          loading: false,
        }));
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to enroll student";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  unenrollStudent: async (assessmentId, studentId) => {
    set({ loading: true, error: null });
    try {
      if (!assessmentId || isNaN(parseInt(assessmentId))) {
        throw new Error("Invalid assessment ID");
      }
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.delete(`${API_URL}/assessments/${parseInt(assessmentId)}/unenroll/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set((state) => ({
          enrolledStudents: state.enrolledStudents.filter((student) => student.id !== Number.parseInt(studentId)),
          loading: false,
        }));
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to unenroll student";
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearCurrentAssessment: () => {
    set({ currentAssessment: null });
  },
}));

export default useAssessmentStore;