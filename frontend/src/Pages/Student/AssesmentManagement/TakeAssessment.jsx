import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import useStudentAssessmentStore from "../../../store/studentAssessmentStore"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function TakeAssessment() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()

  const {
    currentAssessment,
    assessmentQuestions,
    currentAnswers,
    flaggedQuestions,
    timeRemaining,
    currentQuestionIndex,
    isSubmitted,
    loading,
    submitting,
    error,
    startAssessment,
    submitAssessment,
    updateAnswer,
    toggleFlagQuestion,
    setCurrentQuestionIndex,
    nextQuestion,
    previousQuestion,
    decrementTime,
    clearAssessmentData,
  } = useStudentAssessmentStore()

  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        decrementTime()
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining, isSubmitted, decrementTime])

  // Load assessment on mount
  useEffect(() => {
    if (assessmentId) {
      loadAssessment()
    }

    // Cleanup on unmount
    return () => {
      clearAssessmentData()
    }
  }, [assessmentId])

  const loadAssessment = async () => {
    try {
      await startAssessment(assessmentId)
    } catch (error) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Assessment Error",
        message: error.response?.data?.message || "Failed to load assessment",
        onConfirm: () => navigate("/student/dashboard"),
      })
    }
  }

  const handleSubmitAssessment = async () => {
    try {
      await submitAssessment(assessmentId)
      setModal({
        isOpen: true,
        type: "success",
        title: "Assessment Submitted!",
        message: "Your assessment has been submitted successfully. You will be redirected to your dashboard.",
        onConfirm: () => navigate("/student/dashboard"),
      })
    } catch (error) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Submission Failed",
        message: error.response?.data?.message || "Failed to submit assessment",
      })
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

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-red-600" // Last 5 minutes
    if (timeRemaining <= 600) return "text-orange-600" // Last 10 minutes
    return "text-green-600"
  }

  const renderQuestion = (question) => {
    const answer = currentAnswers[question.id] || ""

    switch (question.type) {
      case "multiple_choice":
        return (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        )

      case "short_answer":
        return (
          <textarea
            value={answer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Enter your answer here..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        )

      case "coding":
        return (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Problem Statement:</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{question.problem_statement}</p>
            </div>
            <textarea
              value={answer}
              onChange={(e) => updateAnswer(question.id, e.target.value)}
              placeholder="Write your code here..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={12}
            />
          </div>
        )

      case "essay":
        return (
          <textarea
            value={answer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Write your essay here..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={8}
          />
        )

      default:
        return (
          <input
            type="text"
            value={answer}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Enter your answer..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Submitted!</h2>
          <p className="text-gray-600 mb-6">Your assessment has been submitted successfully.</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!currentAssessment || !assessmentQuestions.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Available</h2>
          <p className="text-gray-600 mb-6">This assessment is not available or has expired.</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = assessmentQuestions[currentQuestionIndex]
  const answeredCount = Object.keys(currentAnswers).length
  const flaggedCount = flaggedQuestions.size

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Assessment Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{currentAssessment.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Time Remaining</p>
                <p className={`text-lg font-bold ${getTimerColor()}`}>{formatTime(timeRemaining)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Answered</p>
                <p className="text-lg font-bold text-blue-600">
                  {answeredCount}/{assessmentQuestions.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Flagged</p>
                <p className="text-lg font-bold text-orange-600">{flaggedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                  {assessmentQuestions.map((question, index) => {
                    const isAnswered = currentAnswers[question.id]
                    const isFlagged = flaggedQuestions.has(question.id)
                    const isCurrent = index === currentQuestionIndex

                    return (
                      <button
                        key={question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`
                          w-10 h-10 rounded-md text-sm font-medium border-2 transition-colors
                          ${
                            isCurrent
                              ? "border-blue-500 bg-blue-500 text-white"
                              : isAnswered
                                ? "border-green-500 bg-green-100 text-green-700"
                                : isFlagged
                                  ? "border-orange-500 bg-orange-100 text-orange-700"
                                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }
                        `}
                      >
                        {index + 1}
                        {isFlagged && <span className="text-xs">🚩</span>}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-500 rounded"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-100 border border-orange-500 rounded"></div>
                    <span>Flagged</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span>Not Answered</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitting}
                  className="w-full mt-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Assessment"}
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {currentQuestion.type.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {currentQuestion.difficulty}
                      </span>
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        {currentQuestion.marks} marks
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">{currentQuestion.question}</h2>
                  </div>
                  <button
                    onClick={() => toggleFlagQuestion(currentQuestion.id)}
                    className={`ml-4 p-2 rounded-md ${
                      flaggedQuestions.has(currentQuestion.id)
                        ? "bg-orange-100 text-orange-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={flaggedQuestions.has(currentQuestion.id) ? "Remove flag" : "Flag for review"}
                  >
                    🚩
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentQuestion.description && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <p className="text-blue-900">{currentQuestion.description}</p>
                  </div>
                )}

                <div>{renderQuestion(currentQuestion)}</div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                  <button
                    onClick={previousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => toggleFlagQuestion(currentQuestion.id)}
                      className={`px-4 py-2 rounded-md ${
                        flaggedQuestions.has(currentQuestion.id)
                          ? "bg-orange-100 text-orange-700 border border-orange-300"
                          : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                      }`}
                    >
                      {flaggedQuestions.has(currentQuestion.id) ? "🚩 Unflag" : "🚩 Flag"}
                    </button>

                    {currentQuestionIndex === assessmentQuestions.length - 1 ? (
                      <button
                        onClick={() => setShowSubmitConfirm(true)}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Submit Assessment
                      </button>
                    ) : (
                      <button
                        onClick={nextQuestion}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        type="warning"
        title="Submit Assessment"
        onConfirm={handleSubmitAssessment}
      >
        <div className="space-y-4">
          <p>Are you sure you want to submit your assessment? This action cannot be undone.</p>
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Questions:</span> {assessmentQuestions.length}
              </div>
              <div>
                <span className="font-medium">Answered:</span> {answeredCount}
              </div>
              <div>
                <span className="font-medium">Flagged:</span> {flaggedCount}
              </div>
              <div>
                <span className="font-medium">Time Remaining:</span> {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
          {answeredCount < assessmentQuestions.length && (
            <p className="text-orange-600 text-sm">
              ⚠️ You have {assessmentQuestions.length - answeredCount} unanswered questions.
            </p>
          )}
        </div>
      </Modal>

      {/* General Modal */}
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

export default TakeAssessment
