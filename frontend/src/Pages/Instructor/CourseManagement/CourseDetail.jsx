import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import useCourseStore from "../../../store/courseStore"
import useAssignmentStore from "../../../store/assignmentStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  // Access stores
  const {
    currentCourse,
    enrolledStudents,
    loading: courseLoading,
    error: courseError,
    getCourseById,
    getCourseStudents,
  } = useCourseStore()
  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    getCourseAssignments,
  } = useAssignmentStore()

  // Local state
  const [activeTab, setActiveTab] = useState("overview")
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch course details, enrolled students, and assignments when component mounts
    const fetchCourseData = async () => {
      setIsLoading(true)
      try {
        await getCourseById(Number.parseInt(courseId))
        await getCourseStudents(Number.parseInt(courseId))
        await getCourseAssignments(Number.parseInt(courseId))
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentCourse?.title}</h1>
              <p className="text-gray-600">Created on {new Date(currentCourse?.created_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
              <Link
                to={`/instructor/courses/${courseId}/edit`}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Edit Course
              </Link>
              <Link
                to={`/instructor/courses/${courseId}/assignments/create`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Add Assignment
              </Link>
              <Link
                to={`/instructor/courses/${courseId}/enroll`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Enroll Students
              </Link>
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
            <button
              onClick={() => setActiveTab("students")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "students"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Students ({enrolledStudents.length})
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
                  <div className="text-3xl font-bold text-green-600 mb-2">{enrolledStudents.length}</div>
                  <div className="text-sm text-green-800">Enrolled Students</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {assignments.filter((a) => new Date(a.due_date) > new Date()).length}
                  </div>
                  <div className="text-sm text-purple-800">Upcoming Deadlines</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Course Assignments</h2>
              <Link
                to={`/instructor/courses/${courseId}/assignments/create`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Add Assignment
              </Link>
            </div>

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
                  <p className="text-gray-600 mb-6">You haven't created any assignments for this course yet.</p>
                  <Link
                    to={`/instructor/courses/${courseId}/assignments/create`}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Create First Assignment
                  </Link>
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
                        Title
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Due Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Submissions
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {assignment.title}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No deadline"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {assignment.submission_count || 0} submissions
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end space-x-2">
                            <Link
                              to={`/instructor/assignments/${assignment.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </Link>
                            <Link
                              to={`/instructor/assignments/${assignment.id}/edit`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              Edit
                            </Link>
                            <Link
                              to={`/instructor/assignments/${assignment.id}/submissions`}
                              className="text-green-600 hover:text-green-900"
                            >
                              Grade
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Enrolled Students</h2>
              <Link
                to={`/instructor/courses/${courseId}/enroll`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Enroll Students
              </Link>
            </div>

            {courseLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600">Loading students...</span>
              </div>
            ) : courseError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-red-500 text-xl mb-4">⚠️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Students</h3>
                  <p className="text-gray-600 mb-4">{courseError}</p>
                  <button
                    onClick={() => getCourseStudents(Number.parseInt(courseId))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                  >
                    Try Again
                  </button>
                </CardContent>
              </Card>
            ) : enrolledStudents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Students Enrolled</h3>
                  <p className="text-gray-600 mb-6">There are no students enrolled in this course yet.</p>
                  <Link
                    to={`/instructor/courses/${courseId}/enroll`}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
                  >
                    Enroll Students
                  </Link>
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

export default CourseDetail
