import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const useStudentAssessmentStore = create((set, get) => ({
  assessmentQuestions: [],
  timeRemaining: 0,
  loading: false,
  error: null,
  isSubmitted: false,
  submission: null,

  // Start assessment
  startAssessment: async (assessmentId) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/taking/assessments/${assessmentId}/start`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({
          assessmentQuestions: response.data.data.questions,
          timeRemaining: response.data.data.duration * 60,
          isSubmitted: false,
          loading: false,
        });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || "Failed to start assessment", loading: false });
    }
  },

  // Update answer
  updateAnswer: (questionId, answer) => {
    set((state) => ({
      assessmentQuestions: state.assessmentQuestions.map((q) =>
        q.id === questionId ? { ...q, answer } : q
      ),
    }));
  },

  // Submit assessment
  submitAssessment: async (assessmentId) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      const answers = get().assessmentQuestions.map((q) => ({
        questionId: q.id,
        answer: q.answer || null,
      }));
      const response = await axios.post(
        `${API_URL}/taking/assessments/${assessmentId}/submit`,
        { answers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        set({ isSubmitted: true, loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || "Failed to submit assessment", loading: false });
    }
  },

  // Print assessment with keys
  printPaper: async (assessmentId) => {
    set({ loading: true, error: null });
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/taking/assessments/${assessmentId}/print`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `assessment_${assessmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      set({ loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || "Failed to print assessment", loading: false });
    }
  },

  // Decrement timer
  decrementTime: () => {
    set((state) => ({
      timeRemaining: state.timeRemaining > 0 ? state.timeRemaining - 1 : 0,
    }));
  },

  // Fetch submission details
  getSubmissionDetails: async (submissionId) => {
    set({ loading: true, error: null, submission: null });
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/taking/submissions/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        set({ submission: response.data.data, loading: false });
      } else {
        set({ error: response.data.message, loading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || "Failed to load submission details", loading: false });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

export default useStudentAssessmentStore;