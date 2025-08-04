import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import useAssignmentStore from "../../../store/assignmentStore"
import useSubmissionStore from "../../../store/submissionStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function AssignmentDetail() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()

  // Access stores
  const {
    currentAssignment,
    loading: assignmentLoading,
    error: assignmentError,
    getAssignmentById,
  } = useAssignmentStore()
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
    getAssignmentSubmissions,
  } = useSubmissionStore()

  // Local state
  const [activeTab, setActiveTab] = useState("details")
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch assignment details and submissions when component mounts
    const fetchAssignmentData = async () => {
      setIsLoading(true)
      try {
        await getAssignmentById(Number.parseInt(assignmentId))
        await getAssignmentSubmissions(Number.parseInt(assignmentId))
      } catch (error) {
        showModal("error", "Error", "Failed to fetch assignment data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssignmentData()
  }, [assignmentId])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  // Format due date
  const formatDueDate = (dateString) => {
    if (!dateString) return "No deadline"

    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calculate submission stats
  const getSubmissionStats = () => {
    const total = submissions.length
    const graded = submissions.filter((sub) => sub.grade).length
    const pending = total - graded

    return { total, graded, pending }
  }

  // If loading, show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading assignment details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If error or assignment not found, show error message
  if ((assignmentError || !currentAssignment) && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Assignment Not Found</h3>
              <p className="text-gray-600 mb-6">
                The assignment you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link
                to="/instructor/courses"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Back to Courses
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  const stats = getSubmissionStats()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assignment Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to={`/instructor/courses/${currentAssignment.course_id}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {currentAssignment.course_title}
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">Assignment</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentAssignment.title}</h1>
              <p className="text-gray-600">Due: {formatDueDate(currentAssignment.due_date)}</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
              <Link
                to={`/instructor/assignments/${assignmentId}/edit`}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Edit Assignment
              </Link>
              <Link
                to={`/instructor/assignments/${assignmentId}/submissions`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Grade Submissions
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("details")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "details"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Assignment Details
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "submissions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Submissions ({submissions.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "details" && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{currentAssignment.description}</p>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{stats.total}</div>
                  <div className="text-sm text-blue-800">Total Submissions</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                  <div className="text-3xl font-bold text-green-600 mb-2">{stats.graded}</div>
                  <div className="text-sm text-green-800">Graded Submissions</div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
                  <div className="text-sm text-yellow-800">Pending Grades</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "submissions" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Student Submissions</h2>
              <Link
                to={`/instructor/assignments/${assignmentId}/submissions`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                View All Submissions
              </Link>
            </div>

            {submissionsLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600">Loading submissions...</span>
              </div>
            ) : submissionsError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-red-500 text-xl mb-4">⚠️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Submissions</h3>
                  <p className="text-gray-600 mb-4">{submissionsError}</p>
                  <button
                    onClick={() => getAssignmentSubmissions(Number.parseInt(assignmentId))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Try Again
                  </button>
                </CardContent>
              </Card>
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Submissions Yet</h3>
                  <p className="text-gray-600 mb-6">No students have submitted this assignment yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                      >
                        Student
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Submitted
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {submissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {submission.student_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {submission.grade ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Graded: {submission.grade}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Needs Grading
                            </span>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <Link
                            to={`/instructor/submissions/${submission.id}/grade`}
                            className="text-green-600 hover:text-green-900"
                          >
                            {submission.grade ? "Update Grade" : "Grade"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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

export default AssignmentDetail
