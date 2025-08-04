import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { z } from "zod"
import useCourseStore from "../../../store/courseStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

// Validation schema for course update
const courseSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters long"),
  description: z.string().min(10, "Course description must be at least 10 characters long"),
})

function EditCourse() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { currentCourse, loading, error, getCourseById, updateCourse } = useCourseStore()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [initialLoading, setInitialLoading] = useState(true)

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

  // Update form data when course details are loaded
  useEffect(() => {
    if (currentCourse) {
      setFormData({
        title: currentCourse.title,
        description: currentCourse.description,
      })
    }
  }, [currentCourse])

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
      courseSchema.parse(formData)
      setErrors({})

      // Update course
      const response = await updateCourse(Number.parseInt(courseId), formData)

      showModal("success", "Course Updated", `Course "${response.course.title}" has been updated successfully!`)

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
        showModal("error", "Update Failed", error.response.data.message || "Failed to update course.")
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
            <p className="mt-4 text-gray-600">Loading course details...</p>
          </div>
        </div>
      </div>
    )
  }

  // If error or course not found, show error message
  if ((error || !currentCourse) && !initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Course Not Found</h3>
              <p className="text-gray-600 mb-6">
                The course you're trying to edit doesn't exist or you don't have permission to edit it.
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Course</h1>
          <p className="text-gray-600">Update the details of your course</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Course Details</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title*
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
                  placeholder="e.g., Introduction to Computer Science"
                  required
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Course Description*
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
                  placeholder="Provide a detailed description of the course content, objectives, and expectations..."
                  required
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Updating...</span>
                    </>
                  ) : (
                    "Update Course"
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

export default EditCourse
