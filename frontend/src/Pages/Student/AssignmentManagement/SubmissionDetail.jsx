import { useState, useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import useSubmissionStore from "../../../store/submissionStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function SubmissionDetail() {
  const { submissionId } = useParams()
  const { currentSubmission, loading, error, getSubmissionById } = useSubmissionStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  useEffect(() => {
    // Fetch submission details when component mounts
    const fetchSubmission = async () => {
      try {
        await getSubmissionById(Number.parseInt(submissionId))
      } catch (error) {
        showModal("error", "Error", "Failed to fetch submission details. Please try again.")
      }
    }

    fetchSubmission()
  }, [submissionId])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading submission details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If error or submission not found, show error message
  if (error || !currentSubmission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Submission Not Found</h3>
              <p className="text-gray-600 mb-6">
                The submission you're looking for doesn't exist or you don't have permission to view it.
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link to={`/student/courses/${currentSubmission.course_id}`} className="text-blue-600 hover:text-blue-800">
              {currentSubmission.course_title}
            </Link>
            <span className="text-gray-500">/</span>
            <Link
              to={`/student/assignments/${currentSubmission.assignment_id}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {currentSubmission.assignment_title}
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">Submission</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submission Details</h1>
          <p className="text-gray-600">Submitted on {new Date(currentSubmission.submitted_at).toLocaleString()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submission Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Your Submission</h2>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment</h3>
                  <p className="text-gray-700">{currentSubmission.assignment_title}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Submitted Work</h3>
                  {currentSubmission.submission_file_url ? (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <a
                        href={currentSubmission.submission_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <span className="mr-2">📎</span>
                        View Submitted Work
                      </a>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No file submitted</p>
                  )}
                </div>

                {currentSubmission.grade && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Grade</h3>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-700 mb-2">{currentSubmission.grade}</div>
                    </div>
                  </div>
                )}

                {currentSubmission.feedback && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Instructor Feedback</h3>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-gray-800 whitespace-pre-line">{currentSubmission.feedback}</p>
                    </div>
                  </div>
                )}

                {!currentSubmission.grade && !currentSubmission.feedback && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">Awaiting Grading</h3>
                    <p className="text-yellow-700">
                      Your submission has been received and is awaiting grading by your instructor.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Actions</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Link
                    to={`/student/assignments/${currentSubmission.assignment_id}/submit`}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition duration-200 block"
                  >
                    Update Submission
                  </Link>
                  <Link
                    to={`/student/courses/${currentSubmission.course_id}`}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 text-center rounded-md hover:bg-gray-300 transition duration-200 block"
                  >
                    Back to Course
                  </Link>
                </div>

                <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-800 mb-2">Submission Status</h3>
                  <div className="flex items-center">
                    <span className="mr-2">Status:</span>
                    {currentSubmission.grade ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Graded
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Awaiting Grade
                      </span>
                    )}
                  </div>
                </div>
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

export default SubmissionDetail
