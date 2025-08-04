import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { z } from "zod"
import useSubmissionStore from "../../../store/submissionStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

// Validation schema for grading
const gradingSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  feedback: z.string().optional(),
})

function GradeSubmission() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const { currentSubmission, loading, error, getSubmissionById, gradeSubmission } = useSubmissionStore()

  const [formData, setFormData] = useState({
    grade: "",
    feedback: "",
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    // Fetch submission details when component mounts
    const fetchSubmission = async () => {
      try {
        await getSubmissionById(Number.parseInt(submissionId))
      } catch (error) {
        showModal("error", "Error", "Failed to fetch submission details. Please try again.")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchSubmission()
  }, [submissionId])

  // Update form data when submission details are loaded
  useEffect(() => {
    if (currentSubmission) {
      setFormData({
        grade: currentSubmission.grade || "",
        feedback: currentSubmission.feedback || "",
      })
    }
  }, [currentSubmission])

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
      gradingSchema.parse(formData)
      setErrors({})

      // Grade submission
      const response = await gradeSubmission(Number.parseInt(submissionId), formData)

      showModal("success", "Submission Graded", `The submission has been graded successfully!`)

      // Navigate back to assignment details after a short delay
      setTimeout(() => {
        if (currentSubmission?.assignment_id) {
          navigate(`/instructor/assignments/${currentSubmission.assignment_id}`)
        } else {
          navigate(`/instructor/courses`)
        }
      }, 2000)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {}
        for (const issue of error.issues) {
          newErrors[issue.path[0]] = issue.message
        }
        setErrors(newErrors)
      } else if (error.response) {
        showModal("error", "Grading Failed", error.response.data.message || "Failed to grade submission.")
      } else {
        showModal("error", "Connection Error", "An unexpected error occurred. Please check your network connection.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // If loading, show loading spinner
  if (initialLoading) {
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
  if ((error || !currentSubmission) && !initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Submission Not Found</h3>
              <p className="text-gray-600 mb-6">
                The submission you're trying to grade doesn't exist or you don't have permission to grade it.
              </p>
              <button
                onClick={() => navigate("/instructor/courses")}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Back to Courses
              </button>
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
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to={`/instructor/assignments/${currentSubmission.assignment_id}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {currentSubmission.assignment_title}
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">Grade Submission</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Grade Submission</h1>
          <p className="text-gray-600">
            Student: {currentSubmission.student_name} | Submitted:{" "}
            {new Date(currentSubmission.submitted_at).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Submission Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Submission Details</h2>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment</h3>
                  <p className="text-gray-700">{currentSubmission.assignment_title}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Student Work</h3>
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

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Submission Status</h3>
                  <div className="flex items-center">
                    <span className="mr-2">Status:</span>
                    {currentSubmission.grade ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Graded: {currentSubmission.grade}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Needs Grading
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grading Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Grade Submission</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-2">
                      Grade*
                    </label>
                    <input
                      type="text"
                      id="grade"
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                        errors.grade ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="e.g., A, B+, 95%, etc."
                      required
                    />
                    {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade}</p>}
                  </div>

                  <div>
                    <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback (Optional)
                    </label>
                    <textarea
                      id="feedback"
                      name="feedback"
                      value={formData.feedback}
                      onChange={handleChange}
                      rows={5}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                        errors.feedback ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="Provide feedback on the student's work..."
                    />
                    {errors.feedback && <p className="text-red-500 text-sm mt-1">{errors.feedback}</p>}
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 flex items-center justify-center disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" color="white" />
                        <span className="ml-2">Submitting Grade...</span>
                      </>
                    ) : (
                      "Submit Grade"
                    )}
                  </button>
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

export default GradeSubmission
