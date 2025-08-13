import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useAuthStore from "../../store/authStore.js"
import useAssessmentStore from "../../store/assessmentStore.js"
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Modal from "../../components/ui/Modal"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

function StudentDashboard() {
  const { user } = useAuthStore()
  const { studentAssessments, loading, getStudentAssessments } = useAssessmentStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await getStudentAssessments()
      } catch (error) {
        console.error("Failed to fetch student assessments:", error)
        showModal("error", "Error", "Failed to fetch your assessments. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [getStudentAssessments])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "enrolled":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "in_progress":
        return "In Progress"
      case "enrolled":
        return "Not Started"
      default:
        return "Unknown"
    }
  }

  // Quick stats
  const completedAssessments = studentAssessments?.filter((a) => a.status === "completed").length || 0
  const pendingAssessments = studentAssessments?.filter((a) => a.status === "enrolled").length || 0
  const inProgressAssessments = studentAssessments?.filter((a) => a.status === "in_progress").length || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}! Here are your assessments.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading your assessments...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{studentAssessments?.length || 0}</div>
                  <div className="text-gray-600">Total Assessments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-green-600">{completedAssessments}</div>
                  <div className="text-gray-600">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">{inProgressAssessments}</div>
                  <div className="text-gray-600">In Progress</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{pendingAssessments}</div>
                  <div className="text-gray-600">Pending</div>
                </CardContent>
              </Card>
            </div>

            {/* My Assessments */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">My Assessments</h2>
                </div>
              </CardHeader>
              <CardContent>
                {!studentAssessments || studentAssessments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessments Yet</h3>
                    <p className="text-gray-600 mb-4">
                      You haven't been enrolled in any assessments yet. Contact your instructor to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentAssessments.map((assessment) => (
                      <div
                        key={assessment.id}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{assessment.title}</h3>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assessment.status)}`}
                          >
                            {getStatusText(assessment.status)}
                          </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{assessment.description}</p>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Instructor:</span>
                            <span className="font-medium">{assessment.instructor_name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Duration:</span>
                            <span className="font-medium">{assessment.duration} minutes</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Total Marks:</span>
                            <span className="font-medium">{assessment.total_marks}</span>
                          </div>
                          {assessment.score !== null && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Your Score:</span>
                              <span className="font-medium text-green-600">
                                {assessment.score}/{assessment.total_marks}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            Enrolled: {new Date(assessment.enrolled_at).toLocaleDateString()}
                          </div>

                          {assessment.status === "enrolled" && (
                            <Link
                              to={`/student/assessments/${assessment.id}/take`}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition duration-200"
                            >
                              Start Assessment
                            </Link>
                          )}

                          {assessment.status === "in_progress" && (
                            <Link
                              to={`/student/assessments/${assessment.id}/take`}
                              className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition duration-200"
                            >
                              Continue
                            </Link>
                          )}

                          {assessment.status === "completed" && (
                            <Link
                              to={`/student/assessments/${assessment.id}/result`}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition duration-200"
                            >
                              View Result
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentAssessments?.slice(0, 5).map((assessment) => (
                    <div key={assessment.id} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm">📝</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {assessment.status === "completed" ? "Completed" : "Enrolled in"} {assessment.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {assessment.instructor_name} • {new Date(assessment.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assessment.status)}`}
                        >
                          {getStatusText(assessment.status)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {(!studentAssessments || studentAssessments.length === 0) && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📊</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                      <p className="text-gray-600">Your assessment activity will appear here.</p>
                    </div>
                  )}
                </div>
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

export default StudentDashboard
