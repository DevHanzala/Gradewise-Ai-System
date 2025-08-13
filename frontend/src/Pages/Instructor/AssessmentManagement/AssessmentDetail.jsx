import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import useAssessmentStore from "../../../store/assessmentStore.js"
import useAuthStore from "../../../store/authStore.js"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function AssessmentDetail() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentAssessment,
    enrolledStudents,
    loading,
    getAssessmentById,
    getEnrolledStudents,
    deleteAssessment,
    unenrollStudent,
  } = useAssessmentStore()

  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [enrollModal, setEnrollModal] = useState({ isOpen: false, studentEmail: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await getAssessmentById(assessmentId)
        await getEnrolledStudents(assessmentId)
      } catch (error) {
        console.error("Failed to fetch assessment details:", error)
        showModal("error", "Error", "Failed to fetch assessment details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    if (assessmentId) {
      fetchData()
    }
  }, [assessmentId, getAssessmentById, getEnrolledStudents])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleDeleteAssessment = async () => {
    if (window.confirm("Are you sure you want to delete this assessment? This action cannot be undone.")) {
      try {
        await deleteAssessment(assessmentId)
        showModal("success", "Success", "Assessment deleted successfully!")
        setTimeout(() => {
          navigate("/instructor/assessments")
        }, 2000)
      } catch (error) {
        console.error("Failed to delete assessment:", error)
      }
    }
  }

  const handleUnenrollStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to unenroll ${studentName} from this assessment?`)) {
      try {
        await unenrollStudent(assessmentId, studentId)
      } catch (error) {
        console.error("Failed to unenroll student:", error)
      }
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading assessment details...</span>
        </div>
        <Footer />
      </div>
    )
  }

  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
            <p className="text-gray-600 mb-4">
              The assessment you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link to="/instructor/assessments" className="text-blue-600 hover:text-blue-800">
              ← Back to Assessments
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <Link to="/instructor/assessments" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Assessments
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentAssessment.title}</h1>
              <p className="text-gray-600">{currentAssessment.description}</p>
            </div>
            <div className="flex space-x-3">
              <Link
                to={`/instructor/assessments/${assessmentId}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Edit Assessment
              </Link>
              <button
                onClick={handleDeleteAssessment}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
              >
                Delete Assessment
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Assessment Details */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Assessment Details</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Duration</h3>
                    <p className="text-lg text-gray-900">{currentAssessment.duration} minutes</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Total Marks</h3>
                    <p className="text-lg text-gray-900">{currentAssessment.total_marks}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Passing Marks</h3>
                    <p className="text-lg text-gray-900">{currentAssessment.passing_marks}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                    <span
                      className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
                        currentAssessment.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {currentAssessment.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>

                {currentAssessment.instructions && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Instructions</h3>
                    <p className="text-gray-900 whitespace-pre-wrap">{currentAssessment.instructions}</p>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentAssessment.start_date && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Start Date</h3>
                      <p className="text-gray-900">{new Date(currentAssessment.start_date).toLocaleString()}</p>
                    </div>
                  )}
                  {currentAssessment.end_date && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">End Date</h3>
                      <p className="text-gray-900">{new Date(currentAssessment.end_date).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Question Blocks */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Question Blocks</h2>
              </CardHeader>
              <CardContent>
                {currentAssessment.question_blocks && currentAssessment.question_blocks.length > 0 ? (
                  <div className="space-y-4">
                    {currentAssessment.question_blocks.map((block, index) => (
                      <div key={block.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{block.block_title}</h3>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              block.difficulty_level === "easy"
                                ? "bg-green-100 text-green-800"
                                : block.difficulty_level === "medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {block.difficulty_level}
                          </span>
                        </div>

                        {block.block_description && <p className="text-gray-600 mb-3">{block.block_description}</p>}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Questions:</span>
                            <span className="ml-1 font-medium">{block.question_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Marks each:</span>
                            <span className="ml-1 font-medium">{block.marks_per_question}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <span className="ml-1 font-medium capitalize">{block.question_type.replace("_", " ")}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <span className="ml-1 font-medium">
                              {block.question_count * block.marks_per_question} marks
                            </span>
                          </div>
                        </div>

                        {block.topics && block.topics.length > 0 && (
                          <div className="mt-3">
                            <span className="text-sm text-gray-500">Topics: </span>
                            <div className="inline-flex flex-wrap gap-1 mt-1">
                              {block.topics.map((topic, topicIndex) => (
                                <span
                                  key={topicIndex}
                                  className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No question blocks configured yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Quick Stats</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrolled Students</span>
                    <span className="font-semibold">{enrolledStudents?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold text-green-600">
                      {enrolledStudents?.filter((s) => s.status === "completed").length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">In Progress</span>
                    <span className="font-semibold text-yellow-600">
                      {enrolledStudents?.filter((s) => s.status === "in_progress").length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Not Started</span>
                    <span className="font-semibold text-blue-600">
                      {enrolledStudents?.filter((s) => s.status === "enrolled").length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Students */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Enrolled Students</h2>
                  <Link
                    to={`/instructor/assessments/${assessmentId}/enroll`}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Add Students
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {enrolledStudents && enrolledStudents.length > 0 ? (
                  <div className="space-y-3">
                    {enrolledStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{student.name}</h3>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}
                            >
                              {getStatusText(student.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{student.email}</p>
                          {student.score !== null && (
                            <p className="text-sm text-green-600 font-medium">
                              Score: {student.score}/{currentAssessment.total_marks}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => handleUnenrollStudent(student.id, student.name)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Enrolled</h3>
                    <p className="text-gray-600 mb-4">No students have been enrolled in this assessment yet.</p>
                    <Link
                      to={`/instructor/assessments/${assessmentId}/enroll`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      Enroll Students
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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

export default AssessmentDetail
