"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useAuthStore from "../../store/authStore.js"
import useAssessmentStore from "../../store/assessmentStore.js"
import useDashboardStore from "../../store/dashboardStore.js"
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Modal from "../../components/ui/Modal"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

function InstructorDashboard() {
  const { user } = useAuthStore()
  const { assessments, getInstructorAssessments } = useAssessmentStore()
  const { overview, loading, getInstructorOverview } = useDashboardStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch instructor's data when component mounts
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await getInstructorAssessments()
        // Only fetch overview if the function exists
        if (getInstructorOverview) {
          try {
            await getInstructorOverview()
          } catch (overviewError) {
            console.warn("Failed to fetch overview data, but assessments loaded successfully:", overviewError)
            // Don't show error modal for overview failure, just log it
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        showModal("error", "Error", "Failed to fetch dashboard data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [getInstructorAssessments, getInstructorOverview])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  // Quick actions for the dashboard
  const quickActions = [
    {
      title: "Create Assessment",
      description: "Add a new assessment",
      icon: "📝",
      link: "/instructor/assessments/create",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Add Student",
      description: "Register new students",
      icon: "👥",
      link: "/instructor/students",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "My Assessments",
      description: "View & manage assessments",
      icon: "🏫",
      link: "/instructor/assessments",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Grade Submissions",
      description: "Review student work",
      icon: "✅",
      link: "/instructor/assessments",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Instructor Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}! Manage your students and assessments.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{assessments?.length || 0}</div>
                  <div className="text-gray-600">My Assessments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-green-600">{overview?.students || 0}</div>
                  <div className="text-gray-600">Enrolled Students</div>
                  {!overview && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{overview?.pendingGrades || 0}</div>
                  <div className="text-gray-600">Pending Grades</div>
                  {!overview && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{overview?.totalAttempts || 0}</div>
                  <div className="text-gray-600">Total Attempts</div>
                  {!overview && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
                </CardContent>
              </Card>
            </div>

            {/* Overview Error Message */}
            {!overview && (
              <Card className="mb-8">
                <CardContent className="text-center py-6">
                  <div className="text-yellow-600 text-lg mb-2">⚠️ Dashboard Overview</div>
                  <p className="text-gray-600">
                    Some dashboard statistics are still loading. This is normal and won't affect your assessment management.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="mb-8">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Link
                      key={index}
                      to={action.link}
                      className={`${action.color} text-white p-6 rounded-lg transition duration-200 block`}
                    >
                      <div className="text-3xl mb-2">{action.icon}</div>
                      <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Assessments */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">My Assessments</h2>
                  <Link to="/instructor/assessments" className="text-blue-600 hover:text-blue-800">
                    View All →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {!assessments || assessments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Yet</h3>
                    <p className="text-gray-600 mb-4">You haven't created any assessments yet.</p>
                    <Link
                      to="/instructor/assessments/create"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      Create Your First Assessment
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Assessment Title
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Students
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Difficulty
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Created
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {assessments.slice(0, 5).map((assessment) => (
                          <tr key={assessment.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {assessment.title}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {assessment.enrolled_count || 0} students
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                assessment.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                assessment.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {assessment.difficulty}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(assessment.created_at).toLocaleDateString()}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Link
                                to={`/instructor/assessments/${assessment.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                </div>
              </CardHeader>
              <CardContent>
                {overview?.recentEnrollments?.length > 0 ? (
                  <div className="space-y-4">
                    {overview.recentEnrollments.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-sm">👥</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.student_name} enrolled in {activity.assessment_title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.enrolled_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                    <p className="text-gray-600">Student enrollments in your assessments will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Footer />

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
      >
        {modal.message}
      </Modal>
    </div>
  )
}

export default InstructorDashboard
