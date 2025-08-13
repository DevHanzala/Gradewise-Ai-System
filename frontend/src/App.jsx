import "./App.css"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import useAuthStore from "./store/authStore.js"
import ProtectedRoute from "./components/ProtectedRoutes.jsx"

// Public pages
import Home from "./Pages/Home.jsx"
import Login from "./Pages/Login.jsx"
import Signup from "./Pages/Signup.jsx"
import VerifyEmail from "./Pages/VerifyEmail.jsx"
import ForgotPassword from "./Pages/ForgotPassword.jsx"
import ResetPassword from "./Pages/ResetPassword.jsx"
import NotFound from "./Pages/NotFound.jsx"

// Profile page
import Profile from "./Pages/Profile.jsx"

// Super Admin pages
import SuperAdminDashboard from "./Pages/SuperAdmin/SuperAdminDashboard.jsx"

// Admin pages
import AdminDashboard from "./Pages/Admin/AdminDashboard.jsx"

// Instructor pages
import InstructorDashboard from "./Pages/Instructor/InstructorDashborad.jsx"
import AddStudent from "./Pages/Instructor/AddStudent.jsx"

// Assessment Management (Instructor)
import AssessmentList from "./Pages/Instructor/AssessmentManagement/AssessmentList.jsx"
import CreateAssessment from "./Pages/Instructor/AssessmentManagement/CreateAssessment.jsx"
import AssessmentDetail from "./Pages/Instructor/AssessmentManagement/AssessmentDetail.jsx"

// Student pages
import StudentDashboard from "./Pages/Student/StudentDashborad.jsx"



function App() {
  const { user } = useAuthStore()

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={user ? <Navigate to={`/${user.role.replace("_", "-")}/dashboard`} /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to={`/${user.role.replace("_", "-")}/dashboard`} /> : <Signup />}
          />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected Profile Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Routes */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Instructor Routes */}
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/students"
            element={
              <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                <AddStudent />
              </ProtectedRoute>
            }
          />

          {/* Assessment Management Routes (Instructor) */}
          <Route
            path="/instructor/assessments"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <AssessmentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/create"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <CreateAssessment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/:assessmentId"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <AssessmentDetail />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
