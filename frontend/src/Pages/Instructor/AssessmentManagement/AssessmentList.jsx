import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import useAssessmentStore from "../../../store/assessmentStore.js"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function AssessmentList() {
  const { assessments, loading, getInstructorAssessments, deleteAssessment } = useAssessmentStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAssessments = async () => {
      setIsLoading(true)
      try {
        console.log("🔄 Fetching assessments for instructor dashboard...")
        await getInstructorAssessments()
        console.log("✅ Assessments loaded successfully")
      } catch (error) {
        console.error("❌ Failed to fetch assessments:", error)
        showModal("error", "Error", "Failed to fetch assessments. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssessments()
  }, [getInstructorAssessments])

  // Refresh assessments when the component mounts or when assessments change
  useEffect(() => {
    if (assessments.length > 0) {
      console.log(`📊 Current assessments in store: ${assessments.length}`)
      // If we have assessments and we're still loading, stop loading
      if (isLoading) {
        setIsLoading(false)
      }
    }
  }, [assessments, isLoading])

  // Show loading state only when we're actually loading and have no assessments
  const shouldShowLoading = isLoading && assessments.length === 0

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleDeleteAssessment = async (assessmentId, assessmentTitle) => {
    if (window.confirm(`Are you sure you want to delete "${assessmentTitle}"? This action cannot be undone.`)) {
      try {
        await deleteAssessment(assessmentId)
        showModal("success", "Success", "Assessment deleted successfully!")
        // Refresh the list after deletion
        setTimeout(() => {
          getInstructorAssessments()
        }, 1000)
      } catch (error) {
        console.error("Failed to delete assessment:", error)
        showModal("error", "Error", "Failed to delete assessment. Please try again.")
      }
    }
  }

  // Filter assessments based on search term and status
  const filteredAssessments =
    assessments?.filter((assessment) => {
      const matchesSearch =
        assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "published" && assessment.is_published) ||
        (filterStatus === "draft" && !assessment.is_published)

      return matchesSearch && matchesStatus
    }) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessments</h1>
              <p className="text-gray-600">Manage your assessments and track student progress.</p>
            </div>
            <Link
              to="/instructor/assessments/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
            >
              Create Assessment
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessment List */}
        {shouldShowLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading assessments...</span>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Assessments ({filteredAssessments.length})</h2>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssessments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm || filterStatus !== "all" ? "No matching assessments" : "No assessments yet"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || filterStatus !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Create your first assessment to get started."}
                  </p>
                  {!searchTerm && filterStatus === "all" && (
                    <Link
                      to="/instructor/assessments/create"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      Create Your First Assessment
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{assessment.title}</h3>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            assessment.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {assessment.is_published ? "Published" : "Draft"}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{assessment.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Duration:</span>
                          <span className="font-medium">{assessment.duration} minutes</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Marks:</span>
                          <span className="font-medium">{assessment.total_marks}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Students:</span>
                          <span className="font-medium">{assessment.enrolled_students || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Question Blocks:</span>
                          <span className="font-medium">{assessment.question_blocks_count || 0}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Created: {new Date(assessment.created_at).toLocaleDateString()}
                        </div>

                        <div className="flex space-x-2">
                          <Link
                            to={`/instructor/assessments/${assessment.id}`}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition duration-200"
                          >
                            View
                          </Link>
                          <Link
                            to={`/instructor/assessments/${assessment.id}/edit`}
                            className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition duration-200"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteAssessment(assessment.id, assessment.title)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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

export default AssessmentList
