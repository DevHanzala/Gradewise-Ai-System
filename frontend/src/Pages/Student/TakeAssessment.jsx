import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Modal from "../../components/ui/Modal"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"
import useAssessmentTakingStore from "../../store/assessmentTakingStore"
import useAssessmentStore from "../../store/assessmentStore"
import useQuestionStore from "../../store/questionStore"
import toast from "react-hot-toast"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

/**
 * Take Assessment Component
 * Handles the complete assessment taking experience using REAL data:
 * - Fetches questions from database
 * - Integrates with assessment taking backend
 * - Real-time progress tracking and autosave
 */
function TakeAssessment() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  // Store hooks
  const { 
    currentAttempt, 
    startAttempt, 
    saveProgress, 
    submitAttempt, 
    loading, 
    error 
  } = useAssessmentTakingStore()
  
  const { getAssessmentById, currentAssessment } = useAssessmentStore()
  const { getQuestionsByAssessment, generatedQuestions, loading: questionsLoading } = useQuestionStore()
  
  // Local state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit when time runs out
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining])

  // Autosave effect
  useEffect(() => {
    if (currentAttempt && Object.keys(answers).length > 0) {
      const autosaveTimer = setTimeout(() => {
        handleAutosave()
      }, 30000) // Autosave every 30 seconds
      
      return () => clearTimeout(autosaveTimer)
    }
  }, [answers, currentAttempt])

  // Start assessment when component mounts
  useEffect(() => {
    if (assessmentId && !currentAttempt) {
      startAssessment()
    }
  }, [assessmentId])

  // Load assessment details and questions
  useEffect(() => {
    if (assessmentId) {
      loadAssessmentData()
    }
  }, [assessmentId])

  const loadAssessmentData = async () => {
    try {
      setLoadingQuestions(true)
      
      // Load assessment details
      await getAssessmentById(assessmentId)
      
      // Load questions from database
      await loadQuestionsFromDatabase()
      
    } catch (error) {
      console.error("Failed to load assessment data:", error)
      toast.error("Failed to load assessment data")
    } finally {
      setLoadingQuestions(false)
    }
  }

  const loadQuestionsFromDatabase = async () => {
    try {
      const token = localStorage.getItem("token")

      // First try to get questions from question blocks
      const response = await axios.get(`${API_URL}/questions/assessment/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success && response.data.data.length > 0) {
        // Convert question blocks to flat question array
        const flatQuestions = response.data.data.flatMap(block => {
          if (block.questions && Array.isArray(block.questions)) {
            return block.questions.map((q, index) => ({
              ...q,
              block_title: block.block_title,
              question_number: index + 1
            }))
          }
          return []
        })
        
        if (flatQuestions.length > 0) {
          setQuestions(flatQuestions)
          return
        }
      }
      
      // Fallback: try to get questions from question store
      await getQuestionsByAssessment(assessmentId)
      if (generatedQuestions && generatedQuestions.length > 0) {
        setQuestions(generatedQuestions)
        return
      }
      
      // If no questions found, show error
      toast.error("No questions found for this assessment. Please contact your instructor.")
      navigate("/student/dashboard")
      
    } catch (error) {
      console.error("Failed to load questions:", error)
      toast.error("Failed to load assessment questions")
        navigate("/student/dashboard")
      }
  }

  const startAssessment = async () => {
    try {
      const attemptData = await startAttempt(parseInt(assessmentId))
      setTimeRemaining(attemptData.time_remaining || 3600) // Default 1 hour
      toast.success(attemptData.resumed ? "Resuming previous attempt" : "Assessment started!")
    } catch (error) {
      toast.error(error.message || "Failed to start assessment")
      navigate("/student/dashboard")
    }
  }

  const handleAutosave = async () => {
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer_text: answer.answer_text || "",
        selected_options: answer.selected_options || []
      }))

      await saveProgress(currentAttempt.attempt_id, answersArray, currentQuestionIndex + 1)
      setLastSaved(new Date())
      console.log("💾 Progress autosaved")
    } catch (error) {
      console.error("Autosave failed:", error)
    }
  }

  const handleAnswerChange = (questionId, answerData) => {
    setAnswers(prev => ({
          ...prev,
      [questionId]: answerData
    }))
  }

  const handleQuestionNavigation = (direction) => {
    if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleAutoSubmit = async () => {
    toast.error("Time's up! Submitting assessment automatically.")
    await handleSubmit()
  }

  const handleSubmit = async () => {
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: parseInt(questionId),
        answer_text: answer.answer_text || "",
        selected_options: answer.selected_options || []
      }))

      await submitAttempt(currentAttempt.attempt_id, answersArray)
        toast.success("Assessment submitted successfully!")
      navigate("/student/dashboard")
    } catch (error) {
      toast.error(error.message || "Failed to submit assessment")
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getQuestionComponent = (question) => {
    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options && question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={answers[question.id]?.selected_options?.includes(option) || false}
                  onChange={(e) => handleAnswerChange(question.id, {
                    answer_text: "",
                    selected_options: [e.target.value]
                  })}
                  className="text-blue-600"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'true_false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={answers[question.id]?.answer_text === option}
                  onChange={(e) => handleAnswerChange(question.id, {
                    answer_text: e.target.value,
                    selected_options: []
                  })}
                  className="text-blue-600"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case 'short_answer':
        return (
          <textarea
            value={answers[question.id]?.answer_text || ""}
            onChange={(e) => handleAnswerChange(question.id, {
              answer_text: e.target.value,
              selected_options: []
            })}
            placeholder="Type your answer here..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        )

      case 'essay':
        return (
          <textarea
            value={answers[question.id]?.answer_text || ""}
            onChange={(e) => handleAnswerChange(question.id, {
              answer_text: e.target.value,
              selected_options: []
            })}
            placeholder="Write your detailed response here..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={8}
          />
        )

      default:
        return <p className="text-gray-500">Question type not supported</p>
    }
  }

  if (loading || !currentAttempt || loadingQuestions) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">
            {loadingQuestions ? "Loading assessment questions..." : "Starting assessment..."}
          </span>
        </div>
        <Footer />
      </div>
    )
  }

  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading assessment details...</span>
        </div>
        <Footer />
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Questions Available</h2>
            <p className="text-gray-600 mb-4">This assessment doesn't have any questions yet.</p>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progressPercentage = Math.round(((currentQuestionIndex + 1) / questions.length) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header with Timer and Progress */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentAssessment.title}
              </h1>
              <p className="text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">
                  {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-gray-500">Time Remaining</div>
              </div>
            </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
          </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
        </div>
      </div>

          {/* Last Saved Indicator */}
          {lastSaved && (
            <div className="mt-2 text-sm text-green-600">
              💾 Last saved: {lastSaved.toLocaleTimeString()}
              </div>
          )}
            </div>
          </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Question {currentQuestion.question_number}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentQuestion.question_type.replace('_', ' ').toUpperCase()} • {currentQuestion.marks || 10} marks
                </p>
                {currentQuestion.block_title && (
                  <p className="text-xs text-blue-600 mt-1">
                    Topic: {currentQuestion.block_title}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>
                </div>
          </CardHeader>
          
          <CardContent>
            <div className="mb-6">
              <p className="text-lg text-gray-700 mb-4">{currentQuestion.question_text}</p>
              {getQuestionComponent(currentQuestion)}
              </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <button
                onClick={() => setShowExitConfirm(true)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Exit Assessment
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleQuestionNavigation('prev')}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  Previous
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                    <button
                    onClick={() => handleQuestionNavigation('next')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                    Next
                    </button>
                  ) : (
                    <button
                    onClick={() => setShowConfirmSubmit(true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
                    >
                    Submit Assessment
                    </button>
                  )}
                </div>
              </div>
          </CardContent>
        </Card>

        {/* Question Navigation Dots */}
        <div className="mt-6 flex justify-center space-x-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentQuestionIndex 
                  ? 'bg-blue-600' 
                  : answers[questions[index]?.id] ? 'bg-green-400' : 'bg-gray-300'
              }`}
              title={`Question ${index + 1}${answers[questions[index]?.id] ? ' (Answered)' : ''}`}
            />
          ))}
            </div>
          </div>

      <Footer />

      {/* Confirm Submit Modal */}
      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        type="warning"
        title="Confirm Submission"
      >
        <div className="text-center">
          <p className="mb-4">Are you sure you want to submit this assessment?</p>
          <p className="text-sm text-gray-600 mb-6">
            You have answered {Object.keys(answers).length} out of {questions.length} questions.
            This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setShowConfirmSubmit(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Submit Assessment
            </button>
          </div>
        </div>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        type="warning"
        title="Exit Assessment"
      >
        <div className="text-center">
          <p className="mb-4">Are you sure you want to exit this assessment?</p>
          <p className="text-sm text-gray-600 mb-6">
            Your progress will be saved automatically, and you can resume later.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setShowExitConfirm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Continue Assessment
            </button>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Exit Assessment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TakeAssessment
