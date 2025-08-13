import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import useCourseStore from "../../../store/courseStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

// Validation schema for student enrollment
const enrollmentSchema = z.object({
  studentEmail: z.string().email("Please enter a valid email address"),
})

function EnrollStudents() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { currentCourse, enrolledStudents, loading, error, getCourseById, getCourseStudents, enrollStudent } =
    useCourseStore()

  const [studentEmail, setStudentEmail] = useState("")
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    // Fetch course details and enrolled students when component mounts
    const fetchCourseData = async () => {
      try {
        await getCourseById(Number.parseInt(courseId))
        await getCourseStudents(Number.parseInt(courseId))
      } catch (error) {
        showModal("error", "Error", "Failed to fetch course data. Please try again.")
      } finally {
        setInitialLoading(false)
      }
    }

    fetchCourseData()
  }, [courseId])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleChange = (e) => {
    setStudentEmail(e.target.value)
    if (errors.studentEmail) {
      setErrors({})
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form data
      enrollmentSchema.parse({ studentEmail })
      setErrors({})

      // Enroll student
      const response = await enrollStudent(Number.parseInt(courseId), studentEmail)

      showModal(
        "success",
        "Student Enrolled",
        `${response.enrollment.student_name} has been successfully enrolled in this course!`,
      )

      // Clear form
      setStudentEmail("")

      // Refresh enrolled students list
      await getCourseStudents(Number.parseInt(courseId))
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {}
        for (const issue of error.issues) {
          newErrors[issue.path[0]] = issue.message
        }
        setErrors(newErrors)
      } else if (error.response) {
        showModal("error", "Enrollment Failed", error.response.data.message || "Failed to enroll student.")
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
                The course you're looking for doesn't exist or you don't have permission to view it.
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
            <Link to={`/instructor/courses/${courseId}`} className="text-blue-600 hover:text-blue-800">
              {currentCourse?.title}
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">Enroll Students</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enroll Students</h1>
          <p className="text-gray-600">Add students to {currentCourse?.title}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enrollment Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Add Student</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      Student Email*
                    </label>
                    <input
                      type="email"
                      id="studentEmail"
                      name="studentEmail"
                      value={studentEmail}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                        errors.studentEmail
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder="student@example.com"
                      required
                    />
                    {errors.studentEmail && <p className="text-red-500 text-sm mt-1">{errors.studentEmail}</p>}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Important Notes</h3>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Student must already have an account in the system</li>
                      <li>• Student will be notified about enrollment</li>
                      <li>• Student will have immediate access to course materials</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 flex items-center justify-center disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" color="white" />
                        <span className="ml-2">Enrolling...</span>
                      </>
                    ) : (
                      "Enroll Student"
                    )}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Enrolled Students List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Enrolled Students</h2>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <LoadingSpinner size="md" />
                    <span className="ml-3 text-gray-600">Loading students...</span>
                  </div>
                ) : enrolledStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No Students Enrolled</h3>
                    <p className="text-gray-600">There are no students enrolled in this course yet.</p>
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
                            Name
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Email
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Enrolled On
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {enrolledStudents.map((student) => (
                          <tr key={student.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {student.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{student.email}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(student.enrolled_at).toLocaleDateString()}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button
                                onClick={() => {
                                  /* Handle unenroll */
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                Unenroll
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default EnrollStudents
