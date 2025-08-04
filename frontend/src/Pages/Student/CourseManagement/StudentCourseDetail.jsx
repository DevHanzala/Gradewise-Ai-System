import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import useCourseStore from "../../../store/courseStore"
import useAssignmentStore from "../../../store/assignmentStore"
import useSubmissionStore from "../../../store/submissionStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function StudentCourseDetail() {
  const { courseId } = useParams()

  // Access stores
  const { currentCourse, loading: courseLoading, error: courseError, getCourseById } = useCourseStore()
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    getCourseAssignments,
  } = useAssignmentStore()
  const { submissions, loading: submissionsLoading, getStudentSubmissions } = useSubmissionStore()

  // Local state
  const [activeTab, setActiveTab] = useState("overview")
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch course details and assignments when component mounts
    const fetchCourseData = async () => {
      setIsLoading(true)
      try {
        await getCourseById(Number.parseInt(courseId))
        await getCourseAssignments(Number.parseInt(courseId))
        await getStudentSubmissions() // Get all student submissions to match with assignments
      } catch (error) {
        showModal("error", "Error", "Failed to fetch course data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourseData()
  }, [courseId])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  // Get submission status for an assignment
  const getSubmissionStatus = (assignmentId) => {
    const submission = submissions.find((sub) => sub.assignment_id === assignmentId)
    if (!submission) return null
    return submission
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

  // Check if assignment is past due
  const isPastDue = (dueDate) => {
    if (!dueDate) return false
    return new Date() > new Date(dueDate)
  }

  // If loading, show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading course details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If error or course not found, show error message
  if ((courseError || !currentCourse) && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Course Not Found</h3>
              <p className="text-gray-600 mb-6">
                The course you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link
                to="/student/courses"
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/student/courses" className="text-blue-600 hover:text-blue-800">
              My Courses
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{currentCourse?.title}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentCourse?.title}</h1>
              <p className="text-gray-600">Instructor: {currentCourse?.instructor_name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "assignments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Assignments ({assignments.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Course Overview</h2>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-line">{currentCourse?.description}</p>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{assignments.length}</div>
                  <div className="text-sm text-blue-800">Total Assignments</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {
                      submissions.filter((sub) => assignments.some((a) => a.id === sub.assignment_id && sub.grade))
                        .length
                    }
                  </div>
                  <div className="text-sm text-green-800">Graded Submissions</div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {assignments.filter((a) => !isPastDue(a.due_date)).length}
                  </div>
                  <div className="text-sm text-yellow-800">Open Assignments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Course Assignments</h2>

            {assignmentsLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600">Loading assignments...</span>
              </div>
            ) : assignmentsError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-red-500 text-xl mb-4">⚠️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assignments</h3>
                  <p className="text-gray-600 mb-4">{assignmentsError}</p>
                  <button
                    onClick={() => getCourseAssignments(Number.parseInt(courseId))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Try Again
                  </button>
                </CardContent>
              </Card>
            ) : assignments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Assignments Yet</h3>
                  <p className="text-gray-600 mb-6">There are no assignments for this course yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const submission = getSubmissionStatus(assignment.id)
                  const isSubmitted = !!submission
                  const isGraded = isSubmitted && !!submission.grade
                  const isPastDueDate = isPastDue(assignment.due_date)

                  return (
                    <Card key={assignment.id} className="overflow-hidden">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">{assignment.title}</h3>
                            <p className="text-sm text-gray-500">Due: {formatDueDate(assignment.due_date)}</p>
                          </div>
                          <div className="mt-4 md:mt-0 flex items-center space-x-4">
                            {isGraded ? (
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                  Grade: {submission.grade}
                                </span>
                                <Link
                                  to={`/student/submissions/${submission.id}`}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  View Feedback
                                </Link>
                              </div>
                            ) : isSubmitted ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Submitted - Awaiting Grade
                              </span>
                            ) : isPastDueDate ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Past Due
                              </span>
                            ) : (
                              <Link
                                to={`/student/assignments/${assignment.id}/submit`}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                              >
                                Submit Assignment
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <Link
                            to={`/student/assignments/${assignment.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Assignment Details →
                          </Link>
                        </div>
                      </div>
                    </Card>
                  )
                })}
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

export default StudentCourseDetail
