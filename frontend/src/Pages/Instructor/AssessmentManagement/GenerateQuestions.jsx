import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { ArrowLeft, Sparkles, RefreshCw, Eye, Download, Trash2 } from "lucide-react"
import Navbar from "../../../components/Navbar"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import useAssessmentStore from "../../../store/assessmentStore"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const GenerateQuestions = () => {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  const { currentAssessment, getAssessmentById } = useAssessmentStore()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState(null)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadAssessmentData()
  }, [assessmentId])

  const loadAssessmentData = async () => {
    try {
      setLoading(true)
      await getAssessmentById(assessmentId)
      await loadExistingQuestions()
    } catch (error) {
      console.error("Error loading assessment:", error)
      toast.error("Failed to load assessment")
      navigate("/instructor/assessments")
    } finally {
      setLoading(false)
    }
  }

  const loadExistingQuestions = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_URL}/questions/${assessmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setGeneratedQuestions(data.data)
      }
    } catch (error) {
      console.error("Error loading existing questions:", error)
    }
  }

  const generateAllQuestions = async (regenerateAll = false) => {
    try {
      setGenerating(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/questions/${assessmentId}/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ regenerateAll }),
      })

      const data = await response.json()

      if (data.success) {
        const storeResponse = await fetch(`${API_URL}/questions/assessment/${assessmentId}/blocks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question_blocks: data.data }),
        })

        const storeData = await storeResponse.json()

        if (storeData.success) {
          toast.success("Questions generated and saved successfully!")
          await loadExistingQuestions()
        } else {
          toast.error(storeData.message || "Failed to save questions to database")
        }
      } else {
        toast.error(data.message || "Failed to generate questions")
      }
    } catch (error) {
      console.error("Error generating questions:", error)
      toast.error("Failed to generate questions")
    } finally {
      setGenerating(false)
    }
  }

  const regenerateBlockQuestions = async (blockTitle) => {
    try {
      setGenerating(true)
      const token = localStorage.getItem("token")

      const response = await fetch(
        `${API_URL}/questions/${assessmentId}/blocks/${encodeURIComponent(blockTitle)}/regenerate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      const data = await response.json()

      if (data.success) {
        toast.success(`Questions regenerated for ${blockTitle}`)
        await loadExistingQuestions()
      } else {
        toast.error(data.message || "Failed to regenerate questions")
      }
    } catch (error) {
      console.error("Error regenerating questions:", error)
      toast.error("Failed to regenerate questions")
    } finally {
      setGenerating(false)
    }
  }

  const deleteAllQuestions = async () => {
    if (!confirm("Are you sure you want to delete all generated questions? This action cannot be undone.")) {
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/questions/${assessmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success("All questions deleted successfully")
        setGeneratedQuestions(null)
      } else {
        toast.error(data.message || "Failed to delete questions")
      }
    } catch (error) {
      console.error("Error deleting questions:", error)
      toast.error("Failed to delete questions")
    } finally {
      setLoading(false)
    }
  }

  const exportQuestions = () => {
    if (!generatedQuestions) return

    const dataStr = JSON.stringify(generatedQuestions, null, 2)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportFileDefaultName = `assessment_${assessmentId}_questions.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()

    toast.success("Questions exported successfully")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
            <button
              onClick={() => navigate("/instructor/assessments")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Assessments
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/instructor/assessments/${assessmentId}`)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Assessment</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Generate Questions with AI</h1>
          <p className="text-gray-600 mt-2">{currentAssessment.title}</p>
        </div>

        {/* Question Blocks Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Question Blocks</h2>

          {currentAssessment.question_blocks && currentAssessment.question_blocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentAssessment.question_blocks.map((block, index) => {
                const blockQuestions = generatedQuestions?.blocks?.find((b) => b.block_title === block.block_title)
                const hasQuestions = blockQuestions && blockQuestions.question_count > 0

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{block.block_title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{block.block_description}</p>
                      </div>
                      {hasQuestions && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Generated</span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Questions:</span>
                        <span className="font-medium">{block.question_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium capitalize">{block.question_type.replace("_", " ")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <span className="font-medium capitalize">{block.difficulty_level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Marks each:</span>
                        <span className="font-medium">{block.marks_per_question}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {hasQuestions ? (
                        <button
                          onClick={() => regenerateBlockQuestions(block.block_title)}
                          disabled={generating}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm disabled:opacity-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                          <span>Regenerate</span>
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500">Not generated yet</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No question blocks found. Please add question blocks to your assessment first.
              </p>
              <button
                onClick={() => navigate(`/instructor/assessments/${assessmentId}`)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Edit Assessment
              </button>
            </div>
          )}
        </div>

        {/* Generation Controls */}
        {currentAssessment.question_blocks && currentAssessment.question_blocks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Question Generation</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-2">
                  Generate questions automatically using Google Gemini AI based on your question blocks configuration.
                </p>
                <p className="text-sm text-gray-500">
                  Questions will be saved to file storage and can be reviewed before publishing the assessment.
                </p>
              </div>

              <div className="flex items-center space-x-4">
                {generatedQuestions && (
                  <>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={exportQuestions}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </button>
                    <button
                      onClick={deleteAllQuestions}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete All</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => generateAllQuestions(false)}
                  disabled={generating}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Sparkles className={`h-4 w-4 ${generating ? "animate-pulse" : ""}`} />
                  <span>{generating ? "Generating..." : "Generate Questions"}</span>
                </button>

                {generatedQuestions && (
                  <button
                    onClick={() => generateAllQuestions(true)}
                    disabled={generating}
                    className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                    <span>Regenerate All</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generated Questions Preview */}
        {generatedQuestions && showPreview && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Generated Questions Preview</h2>
              <div className="text-sm text-gray-600">Total: {generatedQuestions.total_questions} questions</div>
            </div>

            <div className="space-y-8">
              {generatedQuestions.questions.map((question, index) => (
                <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                          {question.marks} {question.marks === 1 ? "mark" : "marks"}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                          {question.difficulty}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                          {question.block_title}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">{question.question}</h3>
                    </div>
                  </div>

                  {/* Multiple Choice Options */}
                  {question.type === "multiple_choice" && question.options && (
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optionIndex) => {
                        const optionValue = option.charAt(0)
                        const isCorrect = optionValue === question.correct_answer

                        return (
                          <div
                            key={optionIndex}
                            className={`p-3 rounded-lg border ${isCorrect ? "border-green-500 bg-green-50" : "border-gray-200"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-900">{option}</span>
                              {isCorrect && (
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">Explanation:</p>
                      <p className="text-blue-700 text-sm">{question.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generation Status */}
        {generating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Questions with AI</h3>
                <p className="text-gray-600 text-sm">
                  Please wait while we generate questions using Google Gemini AI. This may take a few moments...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GenerateQuestions
