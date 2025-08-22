import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import useAssessmentStore from "../../../store/assessmentStore.js"
import useAuthStore from "../../../store/authStore.js"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card.jsx"
import LoadingSpinner from "../../../components/ui/LoadingSpinner.jsx"
import Modal from "../../../components/ui/Modal.jsx"
import Navbar from "../../../components/Navbar.jsx"
import Footer from "../../../components/Footer.jsx"
import toast from "react-hot-toast"

function EnrollStudents() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentAssessment,
    enrolledStudents,
    loading,
    getAssessmentById,
    getEnrolledStudents,
    enrollStudent,
    enrollStudentsByEmail,
  } = useAssessmentStore()

  const [studentEmail, setStudentEmail] = useState("")
  const [bulkEmails, setBulkEmails] = useState("")
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [availableStudents, setAvailableStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        await getAssessmentById(assessmentId)
        await getEnrolledStudents(assessmentId)
        await fetchAvailableStudents()
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Failed to load enrollment data")
      }
    }

    if (assessmentId) {
      fetchData()
    }
  }, [assessmentId, getAssessmentById, getEnrolledStudents])

  const fetchAvailableStudents = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        // No token available
        return
      }

      // Only admins/super_admins can list all users from /auth/users
      if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
        return
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const students = data.users?.filter((user) => user.role === "student") || []
        setAvailableStudents(students)
      } else if (response.status === 401 || response.status === 403) {
        // Not authorized to view all users; silently ignore and let manual email enrollment be used
        setAvailableStudents([])
      }
    } catch (error) {
      console.error("Failed to fetch students:", error)
    }
  }

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleSingleEnrollment = async (e) => {
    e.preventDefault()
    if (!studentEmail.trim()) {
      toast.error("Please enter a student email")
      return
    }

    setIsEnrolling(true)
    try {
      await enrollStudent(assessmentId, studentEmail.trim())
      toast.success("Student enrolled successfully!")
      setStudentEmail("")
      await getEnrolledStudents(assessmentId)
      await fetchAvailableStudents()
    } catch (error) {
      console.error("Failed to enroll student:", error)
      toast.error(error.response?.data?.message || "Failed to enroll student")
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleBulkEnrollment = async (e) => {
    e.preventDefault()
    if (!bulkEmails.trim()) {
      toast.error("Please enter student emails")
      return
    }

    const emails = bulkEmails
      .split(/[,\n]/)
      .map((email) => email.trim())
      .filter((email) => email)

    if (emails.length === 0) {
      toast.error("Please enter valid email addresses")
      return
    }

    setIsEnrolling(true)
    try {
      await enrollStudentsByEmail(assessmentId, emails)
      setBulkEmails("")
      await getEnrolledStudents(assessmentId)
      await fetchAvailableStudents()
    } catch (error) {
      console.error("Bulk enrollment error:", error)
      toast.error(error.response?.data?.message || "Failed to enroll students")
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleSelectStudent = (student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.find((s) => s.id === student.id)
      if (isSelected) {
        return prev.filter((s) => s.id !== student.id)
      } else {
        return [...prev, student]
      }
    })
  }

  const handleEnrollSelected = async () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select students to enroll")
      return
    }

    setIsEnrolling(true)
    try {
      const emails = selectedStudents.map((student) => student.email)
      await enrollStudentsByEmail(assessmentId, emails)
      setSelectedStudents([])
      await getEnrolledStudents(assessmentId)
      await fetchAvailableStudents()
    } catch (error) {
      console.error("Selected enrollment error:", error)
      toast.error(error.response?.data?.message || "Failed to enroll selected students")
    } finally {
      setIsEnrolling(false)
    }
  }

  const filteredStudents = availableStudents.filter((student) => {
    const isAlreadyEnrolled = enrolledStudents?.some((enrolled) => enrolled.id === student.id)
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    return !isAlreadyEnrolled && matchesSearch
  })

  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading assessment...</span>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/instructor/assessments/${assessmentId}`}
            className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← Back to Assessment Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enroll Students</h1>
          <p className="text-gray-600">Add students to: {currentAssessment.title}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enrollment Methods */}
          <div className="space-y-6">
            {/* Single Student Enrollment */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Enroll Single Student</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSingleEnrollment} className="space-y-4">
                  <div>
                    <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Student Email
                    </label>
                    <input
                      type="email"
                      id="studentEmail"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="student@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isEnrolling}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    {isEnrolling ? "Enrolling..." : "Enroll Student"}
                  </button>
                </form>
              </CardContent>
            </Card>

            {/* Bulk Enrollment */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Bulk Enrollment</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBulkEnrollment} className="space-y-4">
                  <div>
                    <label htmlFor="bulkEmails" className="block text-sm font-medium text-gray-700 mb-1">
                      Student Emails (comma or line separated)
                    </label>
                    <textarea
                      id="bulkEmails"
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="student1@example.com, student2@example.com&#10;student3@example.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isEnrolling}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                  >
                    {isEnrolling ? "Enrolling..." : "Enroll All Students"}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Available Students */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Available Students</h2>
                  {selectedStudents.length > 0 && (
                    <button
                      onClick={handleEnrollSelected}
                      disabled={isEnrolling}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      Enroll Selected ({selectedStudents.length})
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search students..."
                    autoComplete="search"
                  />
                </div>

                {/* Students List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className={`p-3 border rounded-lg cursor-pointer transition duration-200 ${
                          selectedStudents.find((s) => s.id === student.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => handleSelectStudent(student)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedStudents.find((s) => s.id === student.id) ? true : false}
                              onChange={() => handleSelectStudent(student)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">👥</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Students</h3>
                      <p className="text-gray-600">
                        {searchTerm
                          ? "No students match your search criteria."
                          : "All students are already enrolled or no students exist."}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Currently Enrolled */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">
                  Currently Enrolled ({enrolledStudents?.length || 0})
                </h2>
              </CardHeader>
              <CardContent>
                {enrolledStudents && enrolledStudents.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {enrolledStudents.map((student) => (
                      <div key={student.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Enrolled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-600">No students enrolled yet.</p>
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
