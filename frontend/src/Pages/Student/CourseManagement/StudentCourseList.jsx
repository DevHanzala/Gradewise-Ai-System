import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useCourseStore from "../../../store/courseStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function StudentCourseList() {
  const { courses, loading, error, getStudentCourses } = useCourseStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  useEffect(() => {
    // Fetch student's enrolled courses when component mounts
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      await getStudentCourses()
    } catch (error) {
      showModal("error", "Error", "Failed to fetch courses. Please try again.")
    }
  }

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
          <p className="text-gray-600">View all courses you're enrolled in</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading courses...</span>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="text-center py-10">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Courses</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchCourses}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Courses Yet</h3>
              <p className="text-gray-600 mb-6">You are not enrolled in any courses yet.</p>
              <p className="text-gray-600">Please contact your instructor if you believe this is an error.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className="border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 truncate" title={course.title}>
                    {course.title}
                  </h2>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-4 h-24 overflow-hidden">
                    <p className="text-gray-600 text-sm line-clamp-4">{course.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div>Instructor: {course.instructor_name}</div>
                    <div>Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}</div>
                  </div>
                  <Link
                    to={`/student/courses/${course.id}`}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition duration-200 block"
                  >
                    View Course
                  </Link>
                </CardContent>
              </Card>
            ))}
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

export default StudentCourseList
