import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase.js";

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Configure Axios defaults for all requests
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.post["Content-Type"] = "application/json";

// Add a request interceptor to include the JWT token in headers for all requests
axios.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add a response interceptor to handle token expiration or invalid tokens
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthEndpoint =
      error.config.url.includes("/auth/login") ||
      error.config.url.includes("/auth/signup") ||
      error.config.url.includes("/auth/google-auth") ||
      error.config.url.includes("/auth/verify") ||
      error.config.url.includes("/auth/forgot-password") ||
      error.config.url.includes("/auth/change-password");

    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      useAuthStore.getState().logout();
      console.error("Unauthorized: Token expired or invalid. User logged out.");
    }
    return Promise.reject(error);
  },
);

// Define the Zustand store for authentication
const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      /**
       * Handles user login by making an API call and storing the token/user info.
       * @param {Object} credentials - Object containing user's email and password.
       * @returns {Promise<Object>} The user object on successful login.
       * @throws {Error} If login fails (e.g., network error, invalid credentials).
       */
      login: async (credentials) => {
        try {
          const response = await axios.post("/auth/login", credentials);
          const { token, user } = response.data;
          set({ token, user }); // Update store state
          return user; // Return user data for redirection
        } catch (error) {
          // Re-throw the error so components can catch and display messages
          throw error;
        }
      },

      /**
       * Handles Google authentication (signup/login).
       * @returns {Promise<Object>} The user object on successful authentication.
       * @throws {Error} If authentication fails.
       */
      googleAuth: async () => {
        try {
          console.log("🔄 Starting Google authentication...");

          // Sign in with Google using Firebase
          const result = await signInWithPopup(auth, googleProvider);
          const firebaseUser = result.user;

          console.log("✅ Firebase Google auth successful:", {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
          });

          // Send user data to backend
          const response = await axios.post("/auth/google-auth", {
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            uid: firebaseUser.uid,
          });

          const { token, user } = response.data;
          set({ token, user }); // Update store state

          console.log("✅ Backend Google auth successful:", user);
          return user; // Return user data for redirection
        } catch (error) {
          console.error("❌ Google auth error:", error);
          // Re-throw the error so components can catch and display messages
          throw error;
        }
      },

      /**
       * Handles user signup by making an API call.
       * @param {Object} userData - Object containing user's name, email, and password.
       * @returns {Promise<Object>} The response data on successful signup.
       * @throws {Error} If signup fails.
       */
      signup: async (userData) => {
        try {
          const response = await axios.post("/auth/signup", userData);
          return response.data; // Return response data (e.g., success message)
        } catch (error) {
          // Re-throw the error so components can catch and display messages
          throw error;
        }
      },

      /**
       * Handles student registration by admin/instructor.
       * @param {Object} studentData - Object containing student's name, email, password, and role.
       * @returns {Promise<Object>} The response data on successful registration.
       * @throws {Error} If registration fails.
       */
      registerStudent: async (studentData) => {
        try {
          const response = await axios.post("/auth/register-student", studentData);
          return response.data; // Return response data
        } catch (error) {
          throw error;
        }
      },

      /**
       * Handles email verification.
       * @param {string} token - The verification token.
       * @returns {Promise<Object>} The response data on successful verification.
       * @throws {Error} If verification fails.
       */
      verifyEmail: async (token) => {
        try {
          const response = await axios.get(`/auth/verify/${token}`);
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      /**
       * Handles forgot password request.
       * @param {Object} data - Object containing user's email.
       * @returns {Promise<Object>} The response data.
       * @throws {Error} If request fails.
       */
      forgotPassword: async (data) => {
        try {
          const response = await axios.post("/auth/forgot-password", data);
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      /**
       * Handles password change for logged-in users or reset after forgot password.
       * @param {Object} data - Object containing currentPassword, newPassword, and optional resetId.
       * @returns {Promise<Object>} The response data.
       * @throws {Error} If change fails.
       */
      changePassword: async ({ currentPassword, newPassword, resetId }) => {
        try {
          const response = await axios.post("/auth/change-password", { currentPassword, newPassword, resetId });
          return response.data;
        } catch (error) {
          throw error.response?.data || error;
        }
      },

      /**
       * Gets all users (admin/super_admin only).
       * @returns {Promise<Object>} The response data containing users.
       * @throws {Error} If request fails.
       */
      getUsers: async () => {
        try {
          const response = await axios.get("/auth/users");
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      /**
       * Changes a user's role (admin/super_admin only).
       * @param {Object} data - Object containing userId, newRole, and userEmail.
       * @returns {Promise<Object>} The response data.
       * @throws {Error} If request fails.
       */
      changeUserRole: async (data) => {
        try {
          const response = await axios.put("/auth/change-role", data);
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      /**
       * Deletes a user (super_admin only).
       * @param {number} userId - The user ID to delete.
       * @returns {Promise<Object>} The response data.
       * @throws {Error} If request fails.
       */
      deleteUser: async (userId) => {
        try {
          const response = await axios.delete(`/auth/users/${userId}`);
          return response.data;
        } catch (error) {
          throw error;
        }
      },

      /**
       * Logs out a user by clearing the token and user information from the store.
       */
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "auth-storage", // Name for the localStorage key
      storage: createJSONStorage(() => localStorage), // Use localStorage for persistence
    },
  ),
);

export default useAuthStore;