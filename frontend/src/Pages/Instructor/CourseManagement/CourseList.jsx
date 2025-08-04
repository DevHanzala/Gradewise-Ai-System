import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useCourseStore from "../../../store/courseStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function CourseList() {
  const { courses, loading, error, getInstructorCourses, deleteCourse } = useCourseStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, courseId: null, courseTitle: "" })
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    // Fetch instructor's courses when component mounts
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      await getInstructorCourses()
    } catch (error) {
      showModal("error", "Error", "Failed to fetch courses. Please try again.")
    }
  }

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const confirmDelete = (courseId, courseTitle) => {
    setDeleteConfirm({ isOpen: true, courseId, courseTitle })
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await deleteCourse(deleteConfirm.courseId)
      setDeleteConfirm({ isOpen: false, courseId: null, courseTitle: "" })
      showModal("success", "Course Deleted", "The course has been successfully deleted.")
    } catch (error) {
      showModal("error", "Deletion Failed", error.response?.data?.message || "Failed to delete course.")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Courses</h1>
            <p className="text-gray-600">Manage your courses and their content</p>
          </div>
          <Link
            to="/instructor/courses/create"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Create New Course
          </Link>
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
              <p className="text-gray-600 mb-6">
                You haven't created any courses yet. Get started by creating your first course!
              </p>
              <Link
                to="/instructor/courses/create"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Create Your First Course
              </Link>
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
                    <div>Created: {new Date(course.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/instructor/courses/${course.id}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/instructor/courses/${course.id}/edit`}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition duration-200"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => confirmDelete(course.id, course.title)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Information Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
      >
        {modal.message}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        type="warning"
        title="Confirm Deletion"
      >
        <p className="mb-4">
          Are you sure you want to delete the course <strong>"{deleteConfirm.courseTitle}"</strong>?
        </p>
        <p className="mb-6 text-sm text-red-600">
          This action cannot be undone. All assignments and student enrollments for this course will also be deleted.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setDeleteConfirm({ isOpen: false, courseId: null, courseTitle: "" })}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
            disabled={deleteLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 flex items-center"
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                <span className="ml-2">Deleting...</span>
              </>
            ) : (
              "Delete Course"
            )}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default CourseList
