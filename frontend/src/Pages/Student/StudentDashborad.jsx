import { useState, useEffect } from "react" // Added import
import { Link } from "react-router-dom" // Added import
import useAuthStore from "../../store/authStore.js"
import useCourseStore from "../../store/courseStore.js" // Added import
import useAssignmentStore from "../../store/assignmentStore.js" // Added import
import useDashboardStore from "../../store/dashboardStore.js" // Added import
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner" // Added import
import Modal from "../../components/ui/Modal" // Added import
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

function StudentDashboard() {
  const { user } = useAuthStore()
  const { courses, getStudentCourses } = useCourseStore() // Added
  const { assignments, getStudentAssignments } = useAssignmentStore() // Added
  const { overview, loading, getStudentOverview } = useDashboardStore() // Added
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" }) // Added
  const [isLoading, setIsLoading] = useState(true) // Added

  useEffect(() => {
    // Fetch student's data when component mounts
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await getStudentCourses()
        await getStudentAssignments()
        await getStudentOverview()
      } catch (error) {
        showModal("error", "Error", "Failed to fetch dashboard data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  // Format due date
  const formatDueDate = (dateString) => {
    if (!dateString) return "No deadline"

    const date = new Date(dateString)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}! Track your progress and assignments.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
                  <div className="text-gray-600">Enrolled Courses</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-green-600">{overview?.gradedSubmissions || 0}</div>
                  <div className="text-gray-600">Graded Submissions</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{overview?.pendingAssignments || 0}</div>
                  <div className="text-gray-600">Pending Assignments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{assignments.length}</div>
                  <div className="text-gray-600">Total Assignments</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Enrolled Courses */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
                    <Link to="/student/courses" className="text-blue-600 hover:text-blue-800">
                      View All →
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📚</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Yet</h3>
                      <p className="text-gray-600">You are not enrolled in any courses yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {courses.slice(0, 3).map((course) => (
                        <Link
                          key={course.id}
                          to={`/student/courses/${course.id}`}
                          className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-200"
                        >
                          <h3 className="font-medium text-gray-900">{course.title}</h3>
                          <p className="text-sm text-gray-500">Instructor: {course.instructor_name}</p>
                        </Link>
                      ))}
                      {courses.length > 3 && (
                        <div className="text-center pt-2">
                          <Link to="/student/courses" className="text-sm text-blue-600 hover:text-blue-800">
                            View {courses.length - 3} more courses
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming Deadlines</h2>
                </CardHeader>
                <CardContent>
                  {assignments.filter((a) => !a.submission_id && new Date(a.due_date) > new Date()).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🎉</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deadlines</h3>
                      <p className="text-gray-600">You're all caught up! No pending assignments.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments
                        .filter((a) => !a.submission_id && new Date(a.due_date) > new Date())
                        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                        .slice(0, 3)
                        .map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-4 bg-red-50 rounded-lg border-l-4 border-red-500"
                          >
                            <div>
                              <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                              <p className="text-sm text-gray-600">{assignment.course_title}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-red-600">
                                Due: {formatDueDate(assignment.due_date)}
                              </div>
                              <Link
                                to={`/student/assignments/${assignment.id}/submit`}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Submit Now →
                              </Link>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Grades */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Recent Grades</h2>
              </CardHeader>
              <CardContent>
                {overview?.recentGrades?.length > 0 ? (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Assignment
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Course
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Grade
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {overview.recentGrades.map((grade, index) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {grade.assignment_title}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{grade.course_title}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {grade.grade}
                              </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Link
                                to={`/student/submissions/${grade.id}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View Feedback
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Grades Yet</h3>
                    <p className="text-gray-600">You don't have any graded assignments yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
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

export default StudentDashboard
