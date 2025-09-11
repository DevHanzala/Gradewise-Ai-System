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
 * Auto-grading Interface
 * Uses REAL assessment attempts and auto-grading service
 * Integrates with existing backend auto-grading system
 */
function AutoGradingInterface() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [grading, setGrading] = useState(false)
  const [showGradeOverrideModal, setShowGradeOverrideModal] = useState(false)
  const [showRubricModal, setShowRubricModal] = useState(false)
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [assessmentAttempts, setAssessmentAttempts] = useState([])
  const [questionsRequiringManualGrading, setQuestionsRequiringManualGrading] = useState([])
  const [assessmentDetails, setAssessmentDetails] = useState(null)

  useEffect(() => {
    // Load assessment details and attempts
    loadAssessmentData()
  }, [assessmentId])

  const loadAssessmentData = async () => {
    try {
      setLoading(true)
      
      // Load assessment details
      await loadAssessmentDetails()
      
      // Load assessment attempts
      await loadAssessmentAttempts()
      
      // Load questions requiring manual grading
      await loadManualGradingQuestions()
      
    } catch (error) {
      console.error("Failed to load assessment data:", error)
      toast.error("Failed to load assessment data")
    } finally {
      setLoading(false)
    }
  }

  const loadAssessmentDetails = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setAssessmentDetails(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load assessment details:", error)
    }
  }

  const loadAssessmentAttempts = async () => {
    try {
      const token = localStorage.getItem("token")
      
      // Get assessment attempts from database
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}/attempts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        const attempts = response.data.data
        
        // For each attempt, get the detailed questions and answers
        const detailedAttempts = await Promise.all(
          attempts.map(async (attempt) => {
            try {
              const answersResponse = await axios.get(`${API_URL}/assessments/attempt/${attempt.id}/answers`, {
                headers: { Authorization: `Bearer ${token}` }
              })
              
              if (answersResponse.data.success) {
                return {
                  ...attempt,
                  questions: answersResponse.data.data.map(answer => ({
                    id: answer.question_id,
                    question_text: answer.question_text,
                    question_type: answer.question_type,
                    marks: answer.marks,
                    scored_marks: answer.scored_marks,
                    student_answer: answer.answer_text || answer.selected_options?.join(', '),
                    correct_answer: answer.correct_answer,
                    grading_method: answer.grading_method,
                    feedback: answer.feedback,
                    requires_manual_grading: answer.grading_method === 'manual' || answer.grading_method === 'rubric',
                    rubric: answer.rubric,
                    overridden_at: answer.overridden_at,
                    override_reason: answer.override_reason
                  }))
                }
              }
              return attempt
            } catch (error) {
              console.error(`Failed to load answers for attempt ${attempt.id}:`, error)
              return attempt
            }
          })
        )
        
        setAssessmentAttempts(detailedAttempts)
      }
    } catch (error) {
      console.error("Failed to load assessment attempts:", error)
      
      // No fallback data - show empty state
      setAssessmentAttempts([])
    }
  }

  const loadManualGradingQuestions = async () => {
    try {
      const token = localStorage.getItem("token")
      
      // Get questions requiring manual grading
      const response = await axios.get(`${API_URL}/auto-grading/manual-grading/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setQuestionsRequiringManualGrading(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load manual grading questions:", error)
      // Don't show error as this endpoint might not exist yet
    }
  }



  const handleGradeOverride = async (questionId, newScore, feedback, overrideReason) => {
    if (!selectedQuestion) return

    setGrading(true)
    try {
      const token = localStorage.getItem("token")
      
      // Call REAL grade override API
      const response = await axios.post(`${API_URL}/auto-grading/override`, {
        answer_id: questionId,
        new_score: newScore,
        feedback: feedback,
        override_reason: overrideReason,
        instructor_id: assessmentDetails?.instructor_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        // Update local state
        setAssessmentAttempts(prev => prev.map(attempt => ({
          ...attempt,
          questions: attempt.questions.map(q => 
            q.id === questionId ? {
              ...q,
              scored_marks: newScore,
              feedback,
              grading_method: "manual_override",
              overridden_at: new Date().toISOString(),
              override_reason: overrideReason
            } : q
          )
        })))

        // Update total scores
        setAssessmentAttempts(prev => prev.map(attempt => {
          const totalScored = attempt.questions.reduce((sum, q) => sum + q.scored_marks, 0)
          const percentage = (totalScored / attempt.total_marks) * 100
          return {
            ...attempt,
            scored_marks: totalScored,
            percentage: Math.round(percentage * 100) / 100
          }
        }))

        toast.success("Grade overridden successfully!")
        setShowGradeOverrideModal(false)
        setSelectedQuestion(null)
      } else {
        throw new Error(response.data.message || "Failed to override grade")
      }

    } catch (error) {
      console.error("Grade override error:", error)
      
      // Fallback: update local state only
      if (error.response?.status === 500 || error.response?.status === 404) {
        toast.warning("Backend service unavailable. Grade updated locally only.")
        
        // Update local state as fallback
        setAssessmentAttempts(prev => prev.map(attempt => ({
          ...attempt,
          questions: attempt.questions.map(q => 
            q.id === questionId ? {
              ...q,
              scored_marks: newScore,
              feedback,
              grading_method: "manual_override",
              overridden_at: new Date().toISOString(),
              override_reason: overrideReason
            } : q
          )
        })))

        // Update total scores
        setAssessmentAttempts(prev => prev.map(attempt => {
          const totalScored = attempt.questions.reduce((sum, q) => sum + q.scored_marks, 0)
          const percentage = (totalScored / attempt.total_marks) * 100
          return {
            ...attempt,
            scored_marks: totalScored,
            percentage: Math.round(percentage * 100) / 100
          }
        }))

        toast.success("Grade overridden locally!")
        setShowGradeOverrideModal(false)
        setSelectedQuestion(null)
      } else {
        toast.error(error.response?.data?.message || "Failed to override grade")
      }
    } finally {
      setGrading(false)
    }
  }

  const handleManualGrading = (question) => {
    setSelectedQuestion(question)
    setShowGradeOverrideModal(true)
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return "text-green-600"
    if (percentage >= 80) return "text-blue-600"
    if (percentage >= 70) return "text-yellow-600"
    return "text-red-600"
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
              <h1 className="text-3xl font-bold text-gray-900">Auto-grading Management</h1>
              <p className="text-gray-600 mt-2">
                Review and manage auto-graded assessments for: 
                <span className="font-semibold text-blue-600 ml-2">
                  {assessmentDetails?.title || "Loading..."}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRubricModal(true)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-200"
              >
                View Rubrics
              </button>
              <button
                onClick={() => navigate(`/instructor/assessments/${assessmentId}`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Back to Assessment
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-blue-600">
                {assessmentAttempts.length}
              </div>
              <div className="text-sm text-gray-600">Total Attempts</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-green-600">
                {assessmentAttempts.filter(a => a.auto_graded).length}
              </div>
              <div className="text-sm text-gray-600">Auto-graded</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-yellow-600">
                {questionsRequiringManualGrading.length}
              </div>
              <div className="text-sm text-gray-600">Need Manual Review</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(assessmentAttempts.reduce((sum, a) => sum + a.percentage, 0) / assessmentAttempts.length || 0)}%
              </div>
              <div className="text-sm text-gray-600">Average Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Attempts */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Assessment Attempts</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : assessmentAttempts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Attempts Yet</h3>
                <p className="text-gray-600 mb-4">
                  Students haven't taken this assessment yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {assessmentAttempts.map((attempt) => (
                  <div key={attempt.id} className="border border-gray-200 rounded-lg p-6">
                    {/* Attempt Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {attempt.student_name}
                        </h3>
                        <p className="text-sm text-gray-600">{attempt.student_email}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getGradeColor(attempt.percentage)}`}>
                          {attempt.percentage}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {attempt.scored_marks}/{attempt.total_marks} marks
                        </div>
                      </div>
                    </div>

                    {/* Attempt Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-600">Started:</span>
                        <div>{formatDate(attempt.start_time)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Submitted:</span>
                        <div>{formatDate(attempt.submitted_at)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Time Taken:</span>
                        <div>{formatTime(attempt.time_taken)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            attempt.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {attempt.status}
                          </span>
                          {attempt.auto_graded && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Auto-graded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Questions */}
                    {attempt.questions && attempt.questions.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Questions</h4>
                        {attempt.questions.map((question) => (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center space-x-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getQuestionTypeLabel(question.question_type)}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {question.scored_marks}/{question.marks} marks
                                </span>
                                {question.grading_method === "manual_override" && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Manual Override
                                  </span>
                                )}
                              </div>
                              {question.requires_manual_grading && (
                                <button
                                  onClick={() => handleManualGrading(question)}
                                  className="px-3 py-1 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                                >
                                  Review
                                </button>
                              )}
                            </div>
                            
                            <p className="text-gray-900 mb-3">{question.question_text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Student Answer:</span>
                                <div className="mt-1 p-2 bg-gray-50 rounded border">
                                  {question.student_answer || "No answer provided"}
                                </div>
                              </div>
                              {question.correct_answer && (
                                <div>
                                  <span className="text-gray-600">Correct Answer:</span>
                                  <div className="mt-1 p-2 bg-green-50 rounded border">
                                    {question.correct_answer}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {question.feedback && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                <p className="text-sm text-blue-800">
                                  <strong>Feedback:</strong> {question.feedback}
                                </p>
                              </div>
                            )}
                            
                            {question.rubric && (
                              <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                                <p className="text-sm text-yellow-800 font-medium mb-2">Rubric Scoring:</p>
                                <div className="space-y-1">
                                  {question.rubric.criteria.map((criterion, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{criterion.name}:</span>
                                      <span>{criterion.scored}/{criterion.max_marks}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />

      {/* Grade Override Modal */}
      <Modal
        isOpen={showGradeOverrideModal}
        onClose={() => setShowGradeOverrideModal(false)}
        type="warning"
        title="Override Grade"
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded border">
                {selectedQuestion.question_text}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Answer
              </label>
              <p className="text-gray-900 p-3 bg-gray-50 rounded border">
                {selectedQuestion.student_answer || "No answer provided"}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Score
                </label>
                <input
                  type="number"
                  value={selectedQuestion.scored_marks}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Score *
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedQuestion.marks}
                  defaultValue={selectedQuestion.scored_marks}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  id="newScore"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback
              </label>
              <textarea
                rows={3}
                defaultValue={selectedQuestion.feedback}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                id="feedback"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Override Reason *
              </label>
              <textarea
                rows={2}
                placeholder="Explain why you're overriding the auto-grade..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                id="overrideReason"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowGradeOverrideModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newScore = parseInt(document.getElementById('newScore').value)
                  const feedback = document.getElementById('feedback').value
                  const overrideReason = document.getElementById('overrideReason').value
                  
                  if (!newScore || !overrideReason) {
                    toast.error("Please fill in all required fields")
                    return
                  }
                  
                  handleGradeOverride(selectedQuestion.id, newScore, feedback, overrideReason)
                }}
                disabled={grading}
                className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {grading ? <LoadingSpinner size="sm" /> : "Override Grade"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rubrics Modal */}
      <Modal
        isOpen={showRubricModal}
        onClose={() => setShowRubricModal(false)}
        type="info"
        title="Grading Rubrics"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Multiple Choice & True/False</h3>
            <p className="text-gray-600">Automatically graded based on correct answer selection.</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Short Answer Questions</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Content Understanding (60%)</h4>
                <p className="text-sm text-gray-600">Accuracy and completeness of the answer</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Clarity (40%)</h4>
                <p className="text-sm text-gray-600">How well the answer is expressed</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Essay Questions</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Content & Analysis (50%)</h4>
                <p className="text-sm text-gray-600">Depth of understanding and critical thinking</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Structure & Organization (30%)</h4>
                <p className="text-sm text-gray-600">Logical flow and coherence</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Language & Style (20%)</h4>
                <p className="text-sm text-gray-600">Clarity, grammar, and presentation</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setShowRubricModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AutoGradingInterface