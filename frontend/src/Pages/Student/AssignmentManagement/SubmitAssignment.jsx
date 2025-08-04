import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { z } from "zod"
import useAssignmentStore from "../../../store/assignmentStore"
import useSubmissionStore from "../../../store/submissionStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

// Validation schema for assignment submission
const submissionSchema = z.object({
  assignmentId: z.number().min(1, "Assignment ID is required"),
  submissionFileUrl: z.string().url("Please provide a valid file URL"),
})

function SubmitAssignment() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
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
    getStudentSubmissions,
    submitAssignment,
  } = useSubmissionStore()

  const [formData, setFormData] = useState({
    assignmentId: Number.parseInt(assignmentId),
    submissionFileUrl: "",
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [initialLoading, setInitialLoading] = useState(true)
  const [existingSubmission, setExistingSubmission] = useState(null)

  useEffect(() => {
    // Fetch assignment details and student submissions when component mounts
    const fetchData = async () => {
      try {
        await getAssignmentById(Number.parseInt(assignmentId))
        await getStudentSubmissions()
      } catch (error) {
        showModal("error", "Error", "Failed to fetch assignment data. Please try again.")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchData()
  }, [assignmentId])

  // Check if student has already submitted this assignment
  useEffect(() => {
    if (submissions.length > 0) {
      const submission = submissions.find((sub) => sub.assignment_id === Number.parseInt(assignmentId))
      if (submission) {
        setExistingSubmission(submission)
        setFormData((prev) => ({
          ...prev,
          submissionFileUrl: submission.submission_file_url || "",
        }))
      }
    }
  }, [submissions, assignmentId])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form data
      submissionSchema.parse(formData)
      setErrors({})

      // Submit assignment
      const response = await submitAssignment(formData)

      showModal(
        "success",
        existingSubmission ? "Submission Updated" : "Assignment Submitted",
        existingSubmission
          ? "Your submission has been updated successfully!"
          : "Your assignment has been submitted successfully!",
      )

      // Navigate back to course page after a short delay
      setTimeout(() => {
        navigate(`/student/courses/${currentAssignment.course_id}`)
      }, 2000)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {}
        for (const issue of error.issues) {
          newErrors[issue.path[0]] = issue.message
        }
        setErrors(newErrors)
      } else if (error.response) {
        showModal("error", "Submission Failed", error.response.data.message || "Failed to submit assignment.")
      } else {
        showModal("error", "Connection Error", "An unexpected error occurred. Please check your network connection.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if assignment is past due
  const isPastDue = () => {
    if (!currentAssignment?.due_date) return false
    return new Date() > new Date(currentAssignment.due_date)
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

  // If loading, show loading spinner
  if (initialLoading) {
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
  if ((assignmentError || !currentAssignment) && !initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Assignment Not Found</h3>
              <p className="text-gray-600 mb-6">
                The assignment you're looking for doesn't exist or you don't have permission to view it.
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

  // If assignment is past due, show error message
  if (isPastDue() && !existingSubmission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Link
                to={`/student/courses/${currentAssignment.course_id}`}
                className="text-blue-600 hover:text-blue-800"
              >
                {currentAssignment.course_title}
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900">{currentAssignment.title}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Assignment</h1>
          </div>

          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⏰</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Assignment Past Due</h3>
              <p className="text-gray-600 mb-2">
                This assignment was due on {formatDueDate(currentAssignment.due_date)}.
              </p>
              <p className="text-gray-600 mb-6">
                You can no longer submit this assignment. Please contact your instructor if you need an extension.
              </p>
              <Link
                to={`/student/courses/${currentAssignment.course_id}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Back to Course
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
            <Link to={`/student/courses/${currentAssignment.course_id}`} className="text-blue-600 hover:text-blue-800">
              {currentAssignment.course_title}
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{currentAssignment.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {existingSubmission ? "Update Submission" : "Submit Assignment"}
          </h1>
          <p className="text-gray-600">Due: {formatDueDate(currentAssignment.due_date)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-line">{currentAssignment.description}</p>
                </div>

                {existingSubmission && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">Previous Submission</h3>
                    <p className="text-blue-700 mb-2">
                      You submitted this assignment on {new Date(existingSubmission.submitted_at).toLocaleString()}.
                    </p>
                    {existingSubmission.grade ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                          Grade: {existingSubmission.grade}
                        </span>
                        <Link
                          to={`/student/submissions/${existingSubmission.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Feedback
                        </Link>
                      </div>
                    ) : (
                      <p className="text-blue-700">Your submission is awaiting grading.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Submission Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">
                  {existingSubmission ? "Update Your Submission" : "Submit Your Work"}
                </h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="submissionFileUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      Submission URL*
                    </label>
                    <input
                      type="text"
                      id="submissionFileUrl"
                      name="submissionFileUrl"
                      value={formData.submissionFileUrl}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                        errors.submissionFileUrl
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="https://example.com/your-submission-file"
                      required
                    />
                    {errors.submissionFileUrl && (
                      <p className="text-red-500 text-sm mt-1">{errors.submissionFileUrl}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Provide a URL to your submission file (e.g., Google Drive, Dropbox, GitHub).
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-800 mb-2">Submission Guidelines</h3>
                    <ul className="text-xs text-gray-700 space-y-1">
                      <li>• Make sure your submission is accessible via the URL</li>
                      <li>• Double-check that you've completed all requirements</li>
                      <li>• You can update your submission until the due date</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Link
                      to={`/student/courses/${currentAssignment.course_id}`}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          <span className="ml-2">Submitting...</span>
                        </>
                      ) : existingSubmission ? (
                        "Update Submission"
                      ) : (
                        "Submit Assignment"
                      )}
                    </button>
                  </div>
                </form>
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

export default SubmitAssignment
