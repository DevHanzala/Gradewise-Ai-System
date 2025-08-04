import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import useAuthStore from "./store/authStore.js"
import ProtectedRoute from "./components/ProtectedRoutes.jsx"
import "./App.css"
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

// Course Management (Instructor)
import CreateCourse from "./Pages/Instructor/CourseManagement/CreateCourse.jsx"
import CourseList from "./Pages/Instructor/CourseManagement/CourseList.jsx"
import CourseDetail from "./Pages/Instructor/CourseManagement/CourseDetail.jsx"
import EditCourse from "./Pages/Instructor/CourseManagement/EditCourse.jsx"
import EnrollStudents from "./Pages/Instructor/CourseManagement/EnrollStudents.jsx"

// Assignment Management (Instructor)
import CreateAssignment from "./Pages/Instructor/AssignmentManagement/CreateAssignment.jsx"
import AssignmentDetail from "./Pages/Instructor/AssignmentManagement/AssignmentDetail.jsx"
import GradeSubmission from "./Pages/Instructor/AssignmentManagement/GradeSubmission.jsx"

// Student pages
import StudentDashboard from "./Pages/Student/StudentDashborad.jsx"

// Course Management (Student)
import StudentCourseList from "./Pages/Student/CourseManagement/StudentCourseList.jsx"
import StudentCourseDetail from "./Pages/Student/CourseManagement/StudentCourseDetail.jsx"

// Assignment Management (Student)
import SubmitAssignment from "./Pages/Student/AssignmentManagement/SubmitAssignment.jsx"
import SubmissionDetail from "./Pages/Student/AssignmentManagement/SubmissionDetail.jsx"

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
            path="/instructor/add-student"
            element={
              <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                <AddStudent />
              </ProtectedRoute>
            }
          />

          {/* Course Management Routes (Instructor) */}
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <CourseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/create"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <CreateCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/edit"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <EditCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/enroll"
            element={
              <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                <EnrollStudents />
              </ProtectedRoute>
            }
          />

          {/* Assignment Management Routes (Instructor) */}
          <Route
            path="/instructor/courses/:courseId/assignments/create"
            element={
              <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                <CreateAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assignments/:assignmentId"
            element={
              <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                <AssignmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/submissions/:submissionId/grade"
            element={
              <ProtectedRoute allowedRoles={["instructor", "admin"]}>
                <GradeSubmission />
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

          {/* Course Management Routes (Student) */}
          <Route
            path="/student/courses"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentCourseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses/:courseId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentCourseDetail />
              </ProtectedRoute>
            }
          />

          {/* Assignment Management Routes (Student) */}
          <Route
            path="/student/assignments/:assignmentId/submit"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <SubmitAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/submissions/:submissionId"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <SubmissionDetail />
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
