import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"
import toast from "react-hot-toast"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

/**
 * AI Question Generation Interface
 * Automatically configured based on assessment data
 * Uses REAL AI service to generate questions
 * Optimized for minimal token usage
 */
function AIGenerationInterface() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [generationHistory, setGenerationHistory] = useState([])
  const [assessmentDetails, setAssessmentDetails] = useState(null)
  
  // Auto-configured question block settings
  const [blockConfig, setBlockConfig] = useState({
    block_title: "",
    block_description: "",
    question_count: 5,
    question_type: "multiple_choice",
    difficulty_level: "medium",
    topics: [],
    marks_per_question: 10
  })

  useEffect(() => {
    // Load assessment details and generation history
    loadAssessmentDetails()
    loadGenerationHistory()
  }, [assessmentId])

  const loadAssessmentDetails = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        const assessment = response.data.data
        setAssessmentDetails(assessment)
        
        // Auto-configure block settings based on assessment
        const autoConfig = generateAutoConfig(assessment)
        setBlockConfig(autoConfig)
      }
    } catch (error) {
      console.error("Failed to load assessment details:", error)
      toast.error("Failed to load assessment details")
    }
  }

  const generateAutoConfig = (assessment) => {
    // Automatically determine question type from assessment title/description
    let questionType = "multiple_choice" // Default
    let questionCount = 5
    let marksPerQuestion = 10
    
    const title = assessment.title?.toLowerCase() || ""
    const description = assessment.description?.toLowerCase() || ""
    
    // Auto-detect question type
    if (title.includes("essay") || description.includes("essay")) {
      questionType = "essay"
      questionCount = 3
      marksPerQuestion = 25
    } else if (title.includes("short") || description.includes("short")) {
      questionType = "short_answer"
      questionCount = 4
      marksPerQuestion = 15
    } else if (title.includes("true") || title.includes("false") || 
               description.includes("true") || description.includes("false")) {
      questionType = "true_false"
      questionCount = 8
      marksPerQuestion = 5
    } else {
      // Multiple choice default
      questionType = "multiple_choice"
      questionCount = Math.min(5, Math.floor((assessment.total_marks || 50) / 10))
      marksPerQuestion = Math.floor((assessment.total_marks || 50) / questionCount)
    }
    
    // Auto-detect difficulty from title/description
    let difficulty = "medium"
    if (title.includes("basic") || title.includes("intro") || description.includes("basic")) {
      difficulty = "easy"
    } else if (title.includes("advanced") || title.includes("expert") || description.includes("advanced")) {
      difficulty = "hard"
    }
    
    // Extract topics from title/description
    const topics = extractTopics(title + " " + description)
    
    return {
      block_title: assessment.title || "Assessment Questions",
      block_description: assessment.description || "",
      question_count: questionCount,
      question_type: questionType,
      difficulty_level: difficulty,
      topics: topics,
      marks_per_question: marksPerQuestion
    }
  }

  const extractTopics = (text) => {
    // Simple topic extraction from text
    const commonTopics = [
      "javascript", "react", "node", "python", "java", "sql", "html", "css",
      "algorithms", "data structures", "web development", "programming",
      "mathematics", "science", "history", "literature", "economics"
    ]
    
    const foundTopics = commonTopics.filter(topic => 
      text.toLowerCase().includes(topic)
    )
    
    return foundTopics.length > 0 ? foundTopics : ["general"]
  }

  const loadGenerationHistory = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/ai-generation/audit-logs/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setGenerationHistory(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load generation history:", error)
      // Don't show error toast as this might not be implemented yet
    }
  }

  const handleGenerateQuestions = async () => {
    setGenerating(true)
    try {
      const token = localStorage.getItem("token")
      
      // Call REAL AI generation service with auto-configured settings
      const response = await axios.post(`${API_URL}/ai-generation/generate`, {
        assessment_id: parseInt(assessmentId),
        block_config: {
          ...blockConfig,
          instructor_id: assessmentDetails?.instructor_id
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        const generatedData = response.data.data
        
        // Store question blocks in database
        await storeQuestionBlocks(generatedData.questions)
        
        setGeneratedQuestions(generatedData.questions)
        setShowConfigModal(false)
        toast.success(`✅ Successfully generated ${generatedData.questions.length} questions using AI!`)
        
        // Refresh generation history
        loadGenerationHistory()
      } else {
        throw new Error(response.data.message || "Failed to generate questions")
      }

    } catch (error) {
      console.error("AI Generation error:", error)
      
      // Handle AI service failures
      if (error.response?.status === 500 || error.response?.status === 404) {
        toast.error("AI service temporarily unavailable. Please try again later.")
        handleNoQuestions()
      } else {
        toast.error(error.response?.data?.message || "Failed to generate questions. Please try again.")
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleNoQuestions = () => {
    toast.error("AI service unavailable. Please try again later or contact support.")
    setShowConfigModal(false)
  }

  const storeQuestionBlocks = async (questions) => {
    try {
      const token = localStorage.getItem("token")
      
      // Store question blocks in database
      await axios.post(`${API_URL}/questions/assessment/${assessmentId}/blocks`, {
        questions: questions.map(q => ({
          block_title: blockConfig.block_title,
          block_description: blockConfig.block_description,
          question_type: q.question_type,
          difficulty_level: q.difficulty_level,
          topics: blockConfig.topics,
          marks_per_question: q.marks,
          question_data: q
        }))
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

    } catch (error) {
      console.error("Failed to store question blocks:", error)
      toast.error("Questions generated but failed to save to database")
    }
  }

  const handleSaveQuestions = async () => {
    if (generatedQuestions.length === 0) {
      toast.error("No questions to save")
      return
    }

    setLoading(true)
    try {
      // Questions are already saved when generated
      toast.success("Questions saved successfully!")
      setGeneratedQuestions([])
      navigate(`/instructor/assessments/${assessmentId}`)
    } catch (error) {
      toast.error("Failed to save questions")
      console.error("Save error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateQuestions = () => {
    setGeneratedQuestions([])
    setShowConfigModal(true)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getQuestionTypeLabel = (type) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Question Generation</h1>
              <p className="text-gray-600 mt-2">
                Automatically generate questions for: 
                <span className="font-semibold text-blue-600 ml-2">
                  {assessmentDetails?.title || "Loading..."}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                AI will automatically configure question type, count, and difficulty based on your assessment
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-200"
              >
                View History
              </button>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Generate Questions
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Configuration Summary */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Auto-Configuration Summary</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-semibold text-blue-600">{blockConfig.question_type.replace('_', ' ')}</div>
                <div className="text-sm text-gray-600">Question Type</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">{blockConfig.question_count}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-600">{blockConfig.difficulty_level}</div>
                <div className="text-sm text-gray-600">Difficulty</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-semibold text-yellow-600">{blockConfig.marks_per_question}</div>
                <div className="text-sm text-gray-600">Marks Each</div>
              </div>
            </div>
            {blockConfig.topics.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Topics:</div>
                <div className="flex flex-wrap gap-2">
                  {blockConfig.topics.map((topic, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Status */}
        {generating && (
          <Card className="mb-6">
            <CardContent className="text-center py-8">
              <LoadingSpinner size="lg" />
              <p className="text-lg text-gray-700 mt-4">AI is generating your questions...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Generating:</strong> {blockConfig.question_count} {blockConfig.question_type.replace('_', ' ')} questions
                  <br />
                  <strong>Topic:</strong> {blockConfig.block_title}
                  <br />
                  <strong>Difficulty:</strong> {blockConfig.difficulty_level}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Questions Display */}
        {generatedQuestions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated Questions ({generatedQuestions.length})
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={handleRegenerateQuestions}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleSaveQuestions}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? <LoadingSpinner size="sm" /> : "Save Questions"}
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {generatedQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Q{question.question_number}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getQuestionTypeLabel(question.question_type)}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {question.marks} marks
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {question.difficulty_level}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 mb-3">{question.question_text}</p>
                    
                    {question.options && question.options.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-600">
                              {String.fromCharCode(65 + optIndex)})
                            </span>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.explanation && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Current Configuration</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div><strong>Assessment:</strong> {assessmentDetails?.title || "Loading..."}</div>
                <div><strong>Question Type:</strong> {getQuestionTypeLabel(blockConfig.question_type)}</div>
                <div><strong>Question Count:</strong> {blockConfig.question_count}</div>
                <div><strong>Difficulty:</strong> {blockConfig.difficulty_level}</div>
                <div><strong>Marks per Question:</strong> {blockConfig.marks_per_question}</div>
                <div><strong>Total Marks:</strong> {blockConfig.question_count * blockConfig.marks_per_question}</div>
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Generate Questions
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">AI Service Status</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">AI Service: Operational</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Model: Gemini 1.5 Flash</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Token Limit: 1000</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Optimized for free tier usage with minimal token consumption
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />

      {/* Question Generation Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        type="info"
        title="AI Question Generation Configuration"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Auto-Configuration Applied</h4>
            <p className="text-sm text-blue-800">
              The AI will automatically generate {blockConfig.question_count} {blockConfig.question_type} questions 
              about "{blockConfig.block_title}" with {blockConfig.difficulty_level} difficulty.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Count
              </label>
              <input
                type="number"
                name="question_count"
                value={blockConfig.question_count}
                onChange={(e) => setBlockConfig(prev => ({ ...prev, question_count: parseInt(e.target.value) }))}
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marks per Question
              </label>
              <input
                type="number"
                name="marks_per_question"
                value={blockConfig.marks_per_question}
                onChange={(e) => setBlockConfig(prev => ({ ...prev, marks_per_question: parseInt(e.target.value) }))}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowConfigModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateQuestions}
              disabled={generating}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? <LoadingSpinner size="sm" /> : "Generate with AI"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Generation History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        type="info"
        title="AI Generation History"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {generationHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No AI generation history yet</p>
          ) : (
            generationHistory.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{item.block_title}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Type: {item.question_type.replace('_', ' ')}</p>
                  <p>Difficulty: {item.difficulty_level}</p>
                  <p>Questions: {item.questions_generated}</p>
                  <p>Generated: {formatDate(item.created_at)}</p>
                </div>
                {item.ai_response && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">{item.ai_response}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={() => setShowHistoryModal(false)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default AIGenerationInterface
