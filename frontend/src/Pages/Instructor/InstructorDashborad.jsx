import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useAuthStore from "../../store/authStore.js"
import useCourseStore from "../../store/courseStore.js" // Added import
import useAssignmentStore from "../../store/assignmentStore.js" // Added import
import useDashboardStore from "../../store/dashboardStore.js" // Added import
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Modal from "../../components/ui/Modal"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"

function InstructorDashboard() {
  const { user } = useAuthStore()
  const { courses, getInstructorCourses } = useCourseStore() // Added
  const { assignments, getInstructorAssignments } = useAssignmentStore() // Added
  const { overview, loading, getInstructorOverview } = useDashboardStore() // Added
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [isLoading, setIsLoading] = useState(true) // Added

  useEffect(() => {
    // Fetch instructor's data when component mounts
    const fetchData = async () => {
      setIsLoading(true)
      try {
        await getInstructorCourses()
        await getInstructorAssignments()
        await getInstructorOverview()
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

  // Quick actions for the dashboard
  const quickActions = [
    {
      title: "Create Course",
      description: "Add a new course",
      icon: "📚",
      link: "/instructor/courses/create",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Add Student",
      description: "Register new students",
      icon: "👥",
      link: "/instructor/add-student",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "My Courses",
      description: "View & manage courses",
      icon: "🏫",
      link: "/instructor/courses",
      color: "bg-purple-500 hover:bg-purple-600",
    },
    {
      title: "Grade Submissions",
      description: "Review student work",
      icon: "✅",
      link: "/instructor/courses",
      color: "bg-orange-500 hover:bg-orange-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Instructor Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}! Manage your students and courses.</p>
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
                  <div className="text-gray-600">My Courses</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-green-600">{overview?.students || 0}</div>
                  <div className="text-gray-600">Enrolled Students</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{overview?.pendingGrades || 0}</div>
                  <div className="text-gray-600">Pending Grades</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{assignments.length}</div>
                  <div className="text-gray-600">Assignments</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mb-8">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Link
                      key={index}
                      to={action.link}
                      className={`${action.color} text-white p-6 rounded-lg transition duration-200 block`}
                    >
                      <div className="text-3xl mb-2">{action.icon}</div>
                      <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Courses */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
                  <Link to="/instructor/courses" className="text-blue-600 hover:text-blue-800">
                    View All →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Yet</h3>
                    <p className="text-gray-600 mb-4">You haven't created any courses yet.</p>
                    <Link
                      to="/instructor/courses/create"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      Create Your First Course
                    </Link>
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
                            Course Title
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Students
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Created
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {courses.slice(0, 5).map((course) => (
                          <tr key={course.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {course.title}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {course.enrolled_count || 0} students
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(course.created_at).toLocaleDateString()}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Link
                                to={`/instructor/courses/${course.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Submissions</h2>
                </div>
              </CardHeader>
              <CardContent>
                {overview?.recentSubmissions?.length > 0 ? (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                          >
                            Student
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Assignment
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Submitted
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {overview.recentSubmissions.map((submission, index) => (
                          <tr key={index}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {submission.student_name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {submission.assignment_title}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(submission.submitted_at).toLocaleString()}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Link
                                to={`/instructor/submissions/${submission.id}/grade`}
                                className="text-green-600 hover:text-green-900"
                              >
                                Grade
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Submissions</h3>
                    <p className="text-gray-600">There are no recent submissions from your students.</p>
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

export default InstructorDashboard
