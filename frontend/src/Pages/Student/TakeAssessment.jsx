import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { Clock, ChevronLeft, ChevronRight, Flag, Send, AlertTriangle } from "lucide-react"
import Navbar from "../../components/Navbar"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Modal from "../../components/ui/Modal"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

const TakeAssessment = () => {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  // State management
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autoSubmitWarning, setAutoSubmitWarning] = useState(false)

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && session?.status === "active") {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1

          // Show warning when 5 minutes remaining
          if (newTime === 300 && !autoSubmitWarning) {
            setAutoSubmitWarning(true)
            toast.error("⚠️ Only 5 minutes remaining! Assessment will auto-submit when time expires.")
          }

          // Auto-submit when time expires
          if (newTime <= 0) {
            handleAutoSubmit()
            return 0
          }

          return newTime
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining, session?.status, autoSubmitWarning])

  // Load or start assessment
  useEffect(() => {
    startOrResumeAssessment()
  }, [assessmentId])

  const startOrResumeAssessment = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/taking/${assessmentId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        // Load session details
        await loadSessionDetails(data.data.session_id)
        toast.success(data.message)
      } else {
        toast.error(data.message)
        navigate("/student/dashboard")
      }
    } catch (error) {
      console.error("Error starting assessment:", error)
      toast.error("Failed to start assessment")
      navigate("/student/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const loadSessionDetails = async (sessionId) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/taking/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        setTimeRemaining(data.data.time_remaining)
        setCurrentQuestionIndex(data.data.current_question || 0)

        // Load existing answers
        const existingAnswers = {}
        data.data.questions.forEach((q) => {
          if (q.is_answered) {
            existingAnswers[q.question_number] = q.student_answer
          }
        })
        setAnswers(existingAnswers)
      } else {
        toast.error(data.message)
        navigate("/student/dashboard")
      }
    } catch (error) {
      console.error("Error loading session:", error)
      toast.error("Failed to load assessment session")
      navigate("/student/dashboard")
    }
  }

  const saveAnswer = async (questionNumber, answer) => {
    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/taking/sessions/${session.session_id}/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionNumber,
          answer,
          timeSpent: 30, // You can track actual time spent
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAnswers((prev) => ({
          ...prev,
          [questionNumber]: answer,
        }))
        setTimeRemaining(data.data.time_remaining)
      } else {
        toast.error("Failed to save answer")
      }
    } catch (error) {
      console.error("Error saving answer:", error)
      toast.error("Failed to save answer")
    }
  }

  const handleAnswerChange = (answer) => {
    const currentQuestion = session.questions[currentQuestionIndex]
    saveAnswer(currentQuestion.question_number, answer)
  }

  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return

    try {
      setSubmitting(true)
      toast.error("⏰ Time expired! Auto-submitting assessment...")
      await submitAssessment()
    } catch (error) {
      console.error("Auto-submit error:", error)
    }
  }, [submitting])

  const submitAssessment = async () => {
    try {
      setSubmitting(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/taking/sessions/${session.session_id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Assessment submitted successfully!")
        navigate(`/student/submissions/${data.data.submission_id}`)
      } else {
        toast.error(data.message)
        setSubmitting(false)
      }
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toast.error("Failed to submit assessment")
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getAnsweredCount = () => {
    return Object.keys(answers).length
  }

  const navigateToQuestion = (index) => {
    setCurrentQuestionIndex(index)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
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

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = session.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === session.questions.length - 1

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Assessment Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Assessment in Progress</h1>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {session.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-red-500" />
                <span
                  className={`font-mono text-lg ${timeRemaining < 300 ? "text-red-600 font-bold" : "text-gray-900"}`}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Answered: {getAnsweredCount()}/{session.questions.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {session.questions.map((q, index) => (
                  <button
                    key={q.question_number}
                    onClick={() => navigateToQuestion(index)}
                    className={`
                      w-10 h-10 rounded-lg text-sm font-medium transition-colors
                      ${
                        index === currentQuestionIndex
                          ? "bg-blue-600 text-white"
                          : answers[q.question_number]
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }
                    `}
                  >
                    {q.question_number}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span className="text-gray-600">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-gray-600">Not Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">Current</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="text-sm text-gray-500">Question {currentQuestion.question_number}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {currentQuestion.marks} {currentQuestion.marks === 1 ? "mark" : "marks"}
                    </span>
                    <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded capitalize">
                      {currentQuestion.difficulty}
                    </span>
                  </div>
                </div>
                {answers[currentQuestion.question_number] && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Flag className="h-4 w-4" />
                    <span className="text-sm">Answered</span>
                  </div>
                )}
              </div>

              {/* Question Content */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">{currentQuestion.question}</h2>

                {/* Answer Options */}
                {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const optionValue = option.charAt(0) // A, B, C, D
                      return (
                        <label
                          key={index}
                          className={`
                            flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors
                            ${
                              answers[currentQuestion.question_number] === optionValue
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }
                          `}
                        >
                          <input
                            type="radio"
                            name={`question_${currentQuestion.question_number}`}
                            value={optionValue}
                            checked={answers[currentQuestion.question_number] === optionValue}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="mt-1 text-blue-600"
                          />
                          <span className="text-gray-900">{option}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {/* Text Answer for other question types */}
                {currentQuestion.type !== "multiple_choice" && (
                  <div>
                    <textarea
                      value={answers[currentQuestion.question_number] || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={currentQuestion.type === "essay" ? 8 : 4}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {currentQuestion.type === "short_answer" && "Provide a brief answer"}
                      {currentQuestion.type === "essay" && "Provide a detailed response"}
                      {currentQuestion.type === "coding" && "Write your code solution"}
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-4">
                  {isLastQuestion ? (
                    <button
                      onClick={() => setShowSubmitModal(true)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Send className="h-4 w-4" />
                      <span>Submit Assessment</span>
                    </button>
                  ) : (
                    <button
                      onClick={nextQuestion}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Assessment">
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-500 mt-1" />
            <div>
              <p className="text-gray-900 font-medium">Are you sure you want to submit?</p>
              <p className="text-gray-600 text-sm mt-1">
                You have answered {getAnsweredCount()} out of {session.questions.length} questions. Once submitted, you
                cannot make any changes.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Questions:</span>
                <span className="ml-2 font-medium">{session.questions.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Answered:</span>
                <span className="ml-2 font-medium">{getAnsweredCount()}</span>
              </div>
              <div>
                <span className="text-gray-500">Time Remaining:</span>
                <span className="ml-2 font-medium">{formatTime(timeRemaining)}</span>
              </div>
              <div>
                <span className="text-gray-500">Unanswered:</span>
                <span className="ml-2 font-medium">{session.questions.length - getAnsweredCount()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowSubmitModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowSubmitModal(false)
                submitAssessment()
              }}
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Assessment"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TakeAssessment
