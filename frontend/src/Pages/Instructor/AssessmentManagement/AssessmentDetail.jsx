import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import useAssessmentStore from "../../../store/assessmentStore"
import useQuestionStore from "../../../store/questionStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function AssessmentDetail() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  // Assessment Store
  const {
    currentAssessment,
    enrolledStudents,
    assessmentLoading,
    getAssessmentById,
    getEnrolledStudents,
    deleteAssessment,
  } = useAssessmentStore()

  // Question Store
  const {
    generatedQuestions,
    loading: questionLoading,
    generating: questionGenerating,
    generateQuestions,
    getGeneratedQuestions,
    regenerateBlock,
    clearGeneratedQuestions,
  } = useQuestionStore()

  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [selectedBlock, setSelectedBlock] = useState(null)

  useEffect(() => {
    if (assessmentId) {
      console.log("🔄 AssessmentDetail: Loading data for assessment:", assessmentId)
      loadAssessmentData()
    }

    // Cleanup on unmount
    return () => {
      clearGeneratedQuestions()
    }
  }, [assessmentId])

  const loadAssessmentData = async () => {
    try {
      console.log("📋 AssessmentDetail: Starting to load assessment data...")
      await Promise.all([
        getAssessmentById(assessmentId),
        getEnrolledStudents(assessmentId),
        getGeneratedQuestions(assessmentId),
      ])
      console.log("✅ AssessmentDetail: All data loaded successfully")
    } catch (error) {
      console.error("❌ AssessmentDetail: Failed to load assessment data:", error)
    }
  }

  const handleGenerateQuestions = async () => {
    try {
      const result = await generateQuestions(assessmentId)

      // Show success modal with details
      setModal({
        isOpen: true,
        type: "success",
        title: "AI Questions Generated!",
        message: `Successfully generated ${result.total_questions} questions across ${result.generated_blocks.length} blocks.`,
      })
    } catch (error) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Generation Failed",
        message: error.response?.data?.message || "Failed to generate questions",
      })
    }
  }

  const handleRegenerateBlock = async (blockTitle) => {
    try {
      await regenerateBlock(assessmentId, blockTitle)
    } catch (error) {
      console.error("Failed to regenerate block:", error)
    }
  }

  const handleDeleteAssessment = async () => {
    try {
      await deleteAssessment(assessmentId)
      navigate("/instructor/assessments")
    } catch (error) {
      console.error("Failed to delete assessment:", error)
    }
  }

  const showDeleteConfirmation = () => {
    setModal({
      isOpen: true,
      type: "warning",
      title: "Delete Assessment",
      message: "Are you sure you want to delete this assessment? This action cannot be undone.",
      onConfirm: handleDeleteAssessment,
    })
  }

  const renderQuestionPreview = (question) => {
    return (
      <div key={question.id} className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex-1">{question.question}</h4>
          <div className="flex space-x-2 ml-4">
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">{question.type}</span>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">{question.difficulty}</span>
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">{question.marks} marks</span>
          </div>
        </div>

        {question.options && (
          <div className="mb-3">
            <div className="grid grid-cols-1 gap-2">
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-sm ${
                    option.startsWith(question.correct_answer) ? "bg-green-50 border border-green-200" : "bg-gray-50"
                  }`}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        )}

        {question.explanation && (
          <div className="mb-3">
            <p className="text-sm text-gray-600">
              <strong>Explanation:</strong> {question.explanation}
            </p>
          </div>
        )}

        {question.topics && question.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.topics.map((topic, index) => (
              <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const isLoading = assessmentLoading || questionLoading
  const isGenerating = questionGenerating

  // Debug logging
  console.log("🔍 AssessmentDetail Debug:", {
    assessmentId,
    currentAssessment: !!currentAssessment,
    assessmentLoading,
    questionLoading,
    isLoading: assessmentLoading || questionLoading,
    generatedQuestions: generatedQuestions?.length || 0,
    enrolledStudents: enrolledStudents?.length || 0,
    // Log the actual store state
    storeState: {
      currentAssessment: useAssessmentStore.getState().currentAssessment,
      assessmentLoading: useAssessmentStore.getState().assessmentLoading,
      enrolledStudents: useAssessmentStore.getState().enrolledStudents
    }
  })

  // Show loading only if we don't have assessment data yet
  if (assessmentLoading && !currentAssessment) {
    console.log("🔄 AssessmentDetail: Showing loading spinner (no assessment data yet)")
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading assessment...</span>
      </div>
    )
  }

  // Show assessment not found if we're not loading and don't have data
  if (!currentAssessment && !assessmentLoading) {
    console.log("❌ AssessmentDetail: Assessment not found")
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h2>
          <button
            onClick={() => navigate("/instructor/assessments")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    )
  }

  // If we have assessment data, show the content (questions can load separately)
  if (currentAssessment) {
    console.log("✅ AssessmentDetail: Rendering assessment content")
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentAssessment.title}</h1>
              <p className="text-gray-600">{currentAssessment.description}</p>
            </div>
            <div className="flex space-x-3">
                {/* Debug button */}
                <button
                  onClick={() => {
                    console.log("🔍 Manual Store Check:", {
                      currentAssessment: useAssessmentStore.getState().currentAssessment,
                      assessmentLoading: useAssessmentStore.getState().assessmentLoading,
                      enrolledStudents: useAssessmentStore.getState().enrolledStudents
                    })
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Debug Store
                </button>
                
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    🤖 Generate Questions
                  </>
                )}
              </button>
              <Link
                to={`/instructor/assessments/${assessmentId}/enroll`}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Students
              </Link>
              <button
                onClick={() => navigate("/instructor/assessments")}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assessment Details */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Assessment Details</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="text-gray-900">{currentAssessment.duration} minutes</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Marks</label>
                    <p className="text-gray-900">{currentAssessment.total_marks}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Passing Marks</label>
                    <p className="text-gray-900">{currentAssessment.passing_marks}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        currentAssessment.is_published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {currentAssessment.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>

                {currentAssessment.instructions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{currentAssessment.instructions}</p>
                  </div>
                )}

                {(currentAssessment.start_date || currentAssessment.end_date) && (
                  <div className="grid grid-cols-2 gap-4">
                    {currentAssessment.start_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <p className="text-gray-900">{new Date(currentAssessment.start_date).toLocaleString()}</p>
                      </div>
                    )}
                    {currentAssessment.end_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <p className="text-gray-900">{new Date(currentAssessment.end_date).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question Blocks */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Question Blocks</h2>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGenerating}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-md hover:bg-purple-200 disabled:opacity-50"
                  >
                    {isGenerating ? "Generating..." : "🤖 AI Generate"}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                  {questionLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <LoadingSpinner size="md" />
                      <span className="ml-3 text-gray-600">Loading question blocks...</span>
                    </div>
                  ) : generatedQuestions && generatedQuestions.length > 0 ? (
                  <div className="space-y-4">
                      {generatedQuestions.map((block, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">{block.block_title}</h3>
                            <div className="flex space-x-2">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {block.question_type || 'multiple_choice'}
                              </span>
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {block.difficulty_level || 'medium'}
                              </span>
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                {block.question_count || 0} questions
                                </span>
                            </div>
                          </div>

                          {block.block_description && (
                            <p className="text-gray-600 text-sm mb-3">{block.block_description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-gray-500">Questions:</span>
                              <span className="ml-2 font-medium">{block.question_count || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Marks per question:</span>
                              <span className="ml-2 font-medium">{block.marks_per_question || 1}</span>
                            </div>
                          </div>

                          {block.topics && block.topics.length > 0 && (
                            <div className="mb-3">
                              <span className="text-gray-500 text-sm">Topics: </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {block.topics.map((topic, topicIndex) => (
                                  <span
                                    key={topicIndex}
                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                  >
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📝</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Question Blocks Yet</h3>
                      <p className="text-gray-600 mb-4">
                        This assessment doesn't have any question blocks configured yet.
                      </p>
                              <button
                        onClick={handleGenerateQuestions}
                                disabled={isGenerating}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                              >
                        {isGenerating ? "Generating..." : "🤖 Generate Question Blocks"}
                              </button>
                            </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={isGenerating}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isGenerating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Generate Questions
                      </>
                    )}
                  </button>
                  
                  <Link
                    to={`/instructor/assessments/${assessmentId}/enroll`}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-center block"
                  >
                    Add Students
                  </Link>
                  
                <button
                  onClick={() => navigate(`/instructor/assessments/${assessmentId}/edit`)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit Assessment
                </button>
                  
                <button
                  onClick={showDeleteConfirmation}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Assessment
                </button>
              </CardContent>
            </Card>

              {/* Assessment Stats */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Assessment Stats</h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`font-medium ${
                        currentAssessment.is_published ? "text-green-600" : "text-yellow-600"
                      }`}
                    >
                      {currentAssessment.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{currentAssessment.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Marks:</span>
                    <span className="font-medium">{currentAssessment.total_marks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passing Marks:</span>
                    <span className="font-medium">{currentAssessment.passing_marks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Question Blocks:</span>
                    <span className="font-medium">{generatedQuestions ? generatedQuestions.length : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enrolled Students:</span>
                    <span className="font-medium">{enrolledStudents ? enrolledStudents.length : 0}</span>
                  </div>
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
        onConfirm={modal.onConfirm}
      >
        {modal.message}
      </Modal>
    </div>
  )
  }
}

export default AssessmentDetail
