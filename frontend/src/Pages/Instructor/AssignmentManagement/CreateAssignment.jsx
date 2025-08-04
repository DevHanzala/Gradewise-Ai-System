import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import useAssignmentStore from "../../../store/assignmentStore"
import useCourseStore from "../../../store/courseStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

// Validation schema for assignment creation
const assignmentSchema = z.object({
  title: z.string().min(3, "Assignment title must be at least 3 characters long"),
  description: z.string().min(10, "Assignment description must be at least 10 characters long"),
  courseId: z.number().min(1, "Course ID is required"),
  dueDate: z.string().optional(),
})

function CreateAssignment() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { createAssignment } = useAssignmentStore()
  const { currentCourse, getCourseById } = useCourseStore()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseId: Number.parseInt(courseId),
    dueDate: "",
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  useEffect(() => {
    // Fetch course details when component mounts
    const fetchCourse = async () => {
      try {
        await getCourseById(Number.parseInt(courseId))
      } catch (error) {
        showModal("error", "Error", "Failed to fetch course details. Please try again.")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

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
    setLoading(true)

    try {
      // Validate form data
      assignmentSchema.parse(formData)
      setErrors({})

      // Create assignment
      const response = await createAssignment(formData)

      showModal(
        "success",
        "Assignment Created",
        `Assignment "${response.assignment.title}" has been created successfully!`,
      )

      // Reset form
      setFormData({
        title: "",
        description: "",
        courseId: Number.parseInt(courseId),
        dueDate: "",
      })

      // Navigate back to course details after a short delay
      setTimeout(() => {
        navigate(`/instructor/courses/${courseId}`)
      }, 2000)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {}
        for (const issue of error.issues) {
          newErrors[issue.path[0]] = issue.message
        }
        setErrors(newErrors)
      } else if (error.response) {
        showModal("error", "Creation Failed", error.response.data.message || "Failed to create assignment.")
      } else {
        showModal("error", "Connection Error", "An unexpected error occurred. Please check your network connection.")
      }
    } finally {
      setLoading(false)
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
            <p className="mt-4 text-gray-600">Loading course details...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link to={`/instructor/courses/${courseId}`} className="text-blue-600 hover:text-blue-800">
              {currentCourse?.title}
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">Create Assignment</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Assignment</h1>
          <p className="text-gray-600">Add a new assignment to {currentCourse?.title}</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Assignment Details</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Title*
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.title ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="e.g., Midterm Project"
                  required
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.description ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Provide detailed instructions, requirements, and expectations for this assignment..."
                  required
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.dueDate ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  If no due date is set, the assignment will be available indefinitely.
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate(`/instructor/courses/${courseId}`)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    "Create Assignment"
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
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

export default CreateAssignment
