import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import "./App.css"
// Auth Pages
import Login from "./Pages/Login"
import Signup from "./Pages/Signup"
import ForgotPassword from "./Pages/ForgotPassword"
import ResetPassword from "./Pages/ResetPassword"
import VerifyEmail from "./Pages/VerifyEmail"

// General Pages
import Home from "./Pages/Home"
import Profile from "./Pages/Profile"
import NotFound from "./Pages/NotFound"

// Admin Pages
import AdminDashboard from "./Pages/Admin/AdminDashboard"

// Super Admin Pages
import SuperAdminDashboard from "./Pages/SuperAdmin/SuperAdminDashboard"

// Instructor Pages
import InstructorDashboard from "./Pages/Instructor/InstructorDashborad"
import CreateAssessment from "./Pages/Instructor/AssessmentManagement/CreateAssessment"
import AssessmentList from "./Pages/Instructor/AssessmentManagement/AssessmentList"
import AssessmentDetail from "./Pages/Instructor/AssessmentManagement/AssessmentDetail"
import EnrollStudents from "./Pages/Instructor/AssessmentManagement/EnrollStudents"
import GenerateQuestions from "./Pages/Instructor/AssessmentManagement/GenerateQuestions"
import AIGenerationInterface from "./Pages/Instructor/AssessmentManagement/AIGenerationInterface"
import AutoGradingInterface from "./Pages/Instructor/AssessmentManagement/AutoGradingInterface"

import AssessmentAnalytics from "./Pages/Instructor/AssessmentManagement/AssessmentAnalytics"
import AddStudent from "./Pages/Instructor/AddStudent"

// Course Management
import CreateCourse from "./Pages/Instructor/CourseManagement/CreateCourse"
import CourseList from "./Pages/Instructor/CourseManagement/CourseList"
import CourseDetail from "./Pages/Instructor/CourseManagement/CourseDetail"
import EditCourse from "./Pages/Instructor/CourseManagement/EditCourse"
import EnrollStudentsInCourse from "./Pages/Instructor/CourseManagement/EnrollStudents"

// Assignment Management
import CreateAssignment from "./Pages/Instructor/AssignmentManagement/CreateAssignment"
import AssignmentDetail from "./Pages/Instructor/AssignmentManagement/AssignmentDetail"
import GradeSubmission from "./Pages/Instructor/AssignmentManagement/GradeSubmission"

// Student Pages
import StudentDashboard from "./Pages/Student/StudentDashborad"
import StudentCourseList from "./Pages/Student/CourseManagement/StudentCourseList"
import StudentCourseDetail from "./Pages/Student/CourseManagement/StudentCourseDetail"
import SubmitAssignment from "./Pages/Student/AssignmentManagement/SubmitAssignment"
import SubmissionDetail from "./Pages/Student/AssignmentManagement/SubmissionDetail"
import TakeAssessment from "./Pages/Student/AssesmentManagement/TakeAssessment"
import StudentAnalytics from "./Pages/Student/StudentAnalytics"

// Components
import ProtectedRoute from "./components/ProtectedRoutes"

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes */}
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
              <ProtectedRoute requiredRole="super_admin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Instructor Routes */}
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute requiredRole="instructor">
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Assessment Management Routes */}
          <Route
            path="/instructor/assessments"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AssessmentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/create"
            element={
              <ProtectedRoute requiredRole="instructor">
                <CreateAssessment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/:assessmentId"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AssessmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/:assessmentId/enroll"
            element={
              <ProtectedRoute requiredRole="instructor">
                <EnrollStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/:assessmentId/generate-questions"
            element={
              <ProtectedRoute requiredRole="instructor">
                <GenerateQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/:assessmentId/ai-generation"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AIGenerationInterface />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assessments/:assessmentId/auto-grading"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AutoGradingInterface />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/assessments/:assessmentId/analytics"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AssessmentAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Student Management Routes */}
          <Route
            path="/instructor/students"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AddStudent />
              </ProtectedRoute>
            }
          />

          {/* Course Management Routes */}
          <Route
            path="/instructor/courses"
            element={
              <ProtectedRoute requiredRole="instructor">
                <CourseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/create"
            element={
              <ProtectedRoute requiredRole="instructor">
                <CreateCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId"
            element={
              <ProtectedRoute requiredRole="instructor">
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/edit"
            element={
              <ProtectedRoute requiredRole="instructor">
                <EditCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/enroll"
            element={
              <ProtectedRoute requiredRole="instructor">
                <EnrollStudentsInCourse />
              </ProtectedRoute>
            }
          />

          {/* Assignment Management Routes */}
          <Route
            path="/instructor/courses/:courseId/assignments/create"
            element={
              <ProtectedRoute requiredRole="instructor">
                <CreateAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assignments/:assignmentId"
            element={
              <ProtectedRoute requiredRole="instructor">
                <AssignmentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/assignments/:assignmentId/submissions/:submissionId/grade"
            element={
              <ProtectedRoute requiredRole="instructor">
                <GradeSubmission />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/analytics"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentCourseList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/courses/:courseId"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentCourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assignments/:assignmentId/submit"
            element={
              <ProtectedRoute requiredRole="student">
                <SubmitAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/submissions/:submissionId"
            element={
              <ProtectedRoute requiredRole="student">
                <SubmissionDetail />
              </ProtectedRoute>
            }
          />

          {/* Student Assessment Routes */}
          <Route
            path="/student/assessments/:assessmentId/take"
            element={
              <ProtectedRoute requiredRole="student">
                <TakeAssessment />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              theme: {
                primary: "green",
                secondary: "black",
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App
