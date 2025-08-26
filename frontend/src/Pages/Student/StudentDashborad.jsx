import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useAuthStore from "../../store/authStore"
import useAssessmentStore from "../../store/assessmentStore"
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

function StudentDashboard() {
  const { user } = useAuthStore()
  const { studentAssessments, loading, getStudentAssessments } = useAssessmentStore()
  const [stats, setStats] = useState({
    totalAssessments: 0,
    completedAssessments: 0,
    pendingAssessments: 0,
    averageScore: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      await getStudentAssessments()
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }

  useEffect(() => {
  if (studentAssessments.length > 0) {
    // Only keep assessments the student can still attempt
    const attemptable = studentAssessments.filter((a) => {
      const status = getAssessmentStatus(a).status
      return status === "available" || status === "upcoming"
    })

    const completed = studentAssessments.filter((a) => getAssessmentStatus(a).status === "completed").length
    const pending = attemptable.length // treat attemptable as pending

    setStats({
      totalAssessments: attemptable.length,   // 👈 only count attemptable
      completedAssessments: completed,
      pendingAssessments: pending,
      averageScore: 0,
    })
  } else {
    setStats({
      totalAssessments: 0,
      completedAssessments: 0,
      pendingAssessments: 0,
      averageScore: 0,
    })
  }
}, [studentAssessments])


  const getAssessmentStatus = (assessment) => {
    const now = new Date()
    const startDate = assessment.start_date ? new Date(assessment.start_date) : null
    const endDate = assessment.end_date ? new Date(assessment.end_date) : null

    if (endDate && now > endDate) {
      return { status: "expired", color: "red", text: "Expired" }
    }
    if (startDate && now < startDate) {
      return { status: "upcoming", color: "yellow", text: "Upcoming" }
    }
    if (assessment.submitted) {
      return { status: "completed", color: "green", text: "Completed" }
    }
    return { status: "available", color: "blue", text: "Available" }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "No deadline"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Here's your assessment overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingAssessments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Link */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Your Progress</h3>
                <p className="text-gray-600 mb-4">Get detailed insights into your performance and learning recommendations</p>
                <Link
                  to="/student/analytics"
                  className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View Analytics
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Assessments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Available Assessments</h2>
              </CardHeader>
              <CardContent>
                {studentAssessments.length > 0 ? (
                  <div className="space-y-4">
                    {studentAssessments
                      .filter((assessment) => {
                        const status = getAssessmentStatus(assessment)
                        return status.status === "available" || status.status === "upcoming"
                      })
                      .slice(0, 5)
                      .map((assessment) => {
                        const status = getAssessmentStatus(assessment)
                        return (
                          <div
                            key={assessment.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{assessment.title}</h3>
                              <p className="text-sm text-gray-600">{assessment.description}</p>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span>⏱️ {assessment.duration} minutes</span>
                                <span>📝 {assessment.total_marks} marks</span>
                                <span>📅 Due: {formatDate(assessment.end_date)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span
                                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  status.color === "blue"
                                    ? "bg-blue-100 text-blue-800"
                                    : status.color === "yellow"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : status.color === "green"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                }`}
                              >
                                {status.text}
                              </span>
                              {status.status === "available" && (
                                <Link
                                  to={`/student/assessments/${assessment.id}/take`}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                >
                                  Start
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No assessments available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              </CardHeader>
              <CardContent>
                {studentAssessments.length > 0 ? (
                  <div className="space-y-4">
                    {studentAssessments
                      .filter((assessment) => getAssessmentStatus(assessment).status === "completed")
                      .slice(0, 5)
                      .map((assessment) => (
                        <div key={assessment.id} className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{assessment.title}</p>
                            <p className="text-xs text-gray-500">Completed on {formatDate(assessment.submitted_at)}</p>
                          </div>
                          <div className="text-sm font-medium text-green-600">{assessment.score || "Pending"}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  to="/profile"
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">Update Profile</p>
                    <p className="text-sm text-gray-600">Manage your account settings</p>
                  </div>
                </Link>

                <button
                  onClick={loadDashboardData}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">Refresh Data</p>
                    <p className="text-sm text-gray-600">Update your dashboard</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default StudentDashboard
