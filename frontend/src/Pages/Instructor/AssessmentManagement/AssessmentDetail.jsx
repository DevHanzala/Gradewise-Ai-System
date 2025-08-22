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
    loading: assessmentLoading,
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
      loadAssessmentData()
    }

    // Cleanup on unmount
    return () => {
      clearGeneratedQuestions()
    }
  }, [assessmentId])

  const loadAssessmentData = async () => {
    try {
      await Promise.all([
        getAssessmentById(assessmentId),
        getEnrolledStudents(assessmentId),
        getGeneratedQuestions(assessmentId),
      ])
    } catch (error) {
      console.error("Failed to load assessment data:", error)
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

  if (isLoading && !currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!currentAssessment) {
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
                {currentAssessment.question_blocks && currentAssessment.question_blocks.length > 0 ? (
                  <div className="space-y-4">
                    {currentAssessment.question_blocks.map((block, index) => {
                      const generatedBlock = generatedQuestions.find((gq) => gq.block_title === block.block_title)
                      const hasQuestions =
                        generatedBlock && generatedBlock.questions && generatedBlock.questions.length > 0

                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">{block.block_title}</h3>
                            <div className="flex space-x-2">
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                {block.question_type}
                              </span>
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {block.difficulty_level}
                              </span>
                              {hasQuestions && (
                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                  ✅ Generated
                                </span>
                              )}
                            </div>
                          </div>

                          {block.block_description && (
                            <p className="text-gray-600 text-sm mb-3">{block.block_description}</p>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                            <div>
                              <span className="font-medium text-gray-700">Questions:</span>{" "}
                              <span className="text-gray-900">{block.question_count}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Marks Each:</span>{" "}
                              <span className="text-gray-900">{block.marks_per_question}</span>
                            </div>
                          </div>

                          {block.topics && block.topics.length > 0 && (
                            <div className="mb-3">
                              <span className="font-medium text-gray-700 text-sm">Topics:</span>
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

                          {hasQuestions && (
                            <div className="flex space-x-2 mt-3">
                              <button
                                onClick={() =>
                                  setSelectedBlock(selectedBlock === block.block_title ? null : block.block_title)
                                }
                                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                {selectedBlock === block.block_title ? "Hide Questions" : "View Questions"}
                              </button>
                              <button
                                onClick={() => handleRegenerateBlock(block.block_title)}
                                disabled={isGenerating}
                                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                              >
                                🔄 Regenerate
                              </button>
                            </div>
                          )}

                          {selectedBlock === block.block_title && hasQuestions && (
                            <div className="mt-4 border-t pt-4">
                              <h4 className="font-medium text-gray-900 mb-3">Generated Questions:</h4>
                              <div className="max-h-96 overflow-y-auto">
                                {generatedBlock.questions.map((question) => renderQuestionPreview(question))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No question blocks defined</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Enrolled Students</span>
                  <span className="font-semibold text-gray-900">{enrolledStudents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Question Blocks</span>
                  <span className="font-semibold text-gray-900">{currentAssessment.question_blocks?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Generated Questions</span>
                  <span className="font-semibold text-gray-900">
                    {generatedQuestions.reduce((sum, block) => sum + (block.questions?.length || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Questions</span>
                  <span className="font-semibold text-gray-900">
                    {currentAssessment.question_blocks?.reduce((sum, block) => sum + (block.question_count || 0), 0) ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(currentAssessment.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* AI Generation Status */}
            {generatedQuestions.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">🤖 AI Generation Status</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {generatedQuestions.map((block, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{block.block_title}</p>
                        <p className="text-xs text-gray-600">{block.questions?.length || 0} questions</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-green-600">✅ Generated</span>
                        <p className="text-xs text-gray-500">
                          {block.generated_at ? new Date(block.generated_at).toLocaleDateString() : "Recently"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Enrolled Students */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Enrolled Students</h2>
                  <Link
                    to={`/instructor/assessments/${assessmentId}/enroll`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Add More
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {enrolledStudents.length > 0 ? (
                  <div className="space-y-3">
                    {enrolledStudents.slice(0, 5).map((student) => (
                      <div key={student.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(student.enrolled_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {enrolledStudents.length > 5 && (
                      <p className="text-sm text-gray-500 text-center pt-2">
                        +{enrolledStudents.length - 5} more students
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No students enrolled yet</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isGenerating ? "🔄 Generating..." : "🤖 Generate Questions with AI"}
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

export default AssessmentDetail
