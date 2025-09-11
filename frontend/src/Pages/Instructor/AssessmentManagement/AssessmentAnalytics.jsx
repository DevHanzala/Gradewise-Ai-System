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
 * Assessment Analytics Interface
 * Provides comprehensive analytics for instructors:
 * - Per-assessment statistics
 * - Item analysis
 * - Student performance metrics
 * - Data exports
 * - Time-based filtering
 */
function AssessmentAnalytics() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [assessmentDetails, setAssessmentDetails] = useState(null)
  const [timeFilter, setTimeFilter] = useState("all")
  const [selectedQuestions, setSelectedQuestions] = useState([])
  
  // Export options
  const [exportOptions, setExportOptions] = useState({
    format: "csv",
    includeAnswers: true,
    includeAnalytics: true,
    dateRange: "all"
  })

  useEffect(() => {
    loadAssessmentDetails()
    loadAnalytics()
  }, [assessmentId, timeFilter])

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

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      
      const response = await axios.get(`${API_URL}/analytics/assessment/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeFilter }
      })
      
      if (response.data.success) {
        setAnalytics(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load analytics:", error)
      // Don't show error as this endpoint might not exist yet
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem("token")
      
      const response = await axios.post(`${API_URL}/analytics/export`, {
        assessment_id: assessmentId,
        format: exportOptions.format,
        include_answers: exportOptions.includeAnswers,
        include_analytics: exportOptions.includeAnalytics,
        date_range: exportOptions.dateRange,
        time_filter: timeFilter
      }, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `assessment_${assessmentId}_analytics.${exportOptions.format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success("Analytics exported successfully!")
      setShowExportModal(false)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export analytics")
    } finally {
      setExporting(false)
    }
  }

  const getTimeFilterLabel = (filter) => {
    switch (filter) {
      case "today": return "Today"
      case "week": return "This Week"
      case "month": return "This Month"
      case "quarter": return "This Quarter"
      case "year": return "This Year"
      default: return "All Time"
    }
  }

  const formatPercentage = (value) => {
    return `${Math.round(value * 100)}%`
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  if (!assessmentDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Assessment Analytics</h1>
              <p className="text-gray-600 mt-2">
                Detailed performance insights for: 
                <span className="font-semibold text-blue-600 ml-2">
                  {assessmentDetails.title}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Time Filter Summary */}
        <div className="mb-6">
          <Card>
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Showing data for: <span className="font-semibold text-blue-600">{getTimeFilterLabel(timeFilter)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4">Loading analytics data...</p>
          </div>
        ) : analytics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="text-center py-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.totalAttempts || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Attempts</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center py-6">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.averageScore ? formatPercentage(analytics.averageScore) : "0%"}
                  </div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center py-6">
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.passRate ? formatPercentage(analytics.passRate) : "0%"}
                  </div>
                  <div className="text-sm text-gray-600">Pass Rate</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="text-center py-6">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analytics.averageTime ? formatTime(analytics.averageTime) : "0m"}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Time</div>
                </CardContent>
              </Card>
            </div>

            {/* Score Distribution */}
            <Card className="mb-8">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Score Distribution</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.scoreRanges && analytics.scoreRanges.map((range, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-24 text-sm font-medium text-gray-700">
                        {range.min}-{range.max}%
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                          style={{ width: `${(range.count / analytics.totalAttempts) * 100}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-sm text-gray-600 text-right">
                        {range.count} students
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question Analysis */}
            <Card className="mb-8">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Question Analysis</h2>
              </CardHeader>
              <CardContent>
                {analytics.questionAnalysis && analytics.questionAnalysis.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.questionAnalysis.map((question, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-900">
                            Q{question.question_number}: {question.question_text.substring(0, 100)}...
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {question.difficulty}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Success Rate:</span>
                            <div className="font-medium">{formatPercentage(question.successRate)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Avg. Time:</span>
                            <div className="font-medium">{formatTime(question.averageTime)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Discrimination:</span>
                            <div className="font-medium">{question.discriminationIndex ? question.discriminationIndex.toFixed(2) : "N/A"}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Difficulty:</span>
                            <div className="font-medium">{question.difficultyIndex ? question.difficultyIndex.toFixed(2) : "N/A"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No question analysis data available</p>
                )}
              </CardContent>
            </Card>

            {/* Student Performance */}
            <Card className="mb-8">
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
              </CardHeader>
              <CardContent>
                {analytics.topPerformers && analytics.topPerformers.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topPerformers.map((student, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                          <div>
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-600">{student.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{formatPercentage(student.score)}</div>
                          <div className="text-sm text-gray-600">{formatTime(student.timeTaken)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No student performance data available</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
              <p className="text-gray-600 mb-4">
                Analytics will appear here once students start taking this assessment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        type="info"
        title="Export Assessment Analytics"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Format
            </label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={exportOptions.dateRange}
              onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="lastYear">Last Year</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={exportOptions.includeAnswers}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeAnswers: e.target.checked }))}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Include student answers</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={exportOptions.includeAnalytics}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeAnalytics: e.target.checked }))}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Include analytics data</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowExportModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? <LoadingSpinner size="sm" /> : "Export Data"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AssessmentAnalytics