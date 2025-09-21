import { useState, useEffect, useMemo } from "react"
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"
import axios from "axios"
import toast from "react-hot-toast"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

function StudentAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [performance, setPerformance] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const chartBars = useMemo(() => {
    if (!performance?.length) return []
    const max = Math.max(...performance.map(p => Math.round(p.average_score || 0)), 100)
    return performance.map(p => ({
      label: new Date(p.date).toLocaleDateString(),
      value: Math.round(p.average_score || 0),
      width: `${Math.min(100, Math.round(((p.average_score || 0) / max) * 100))}%`
    }))
  }, [performance])

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      const [analyticsRes, performanceRes, recommendationsRes] = await Promise.all([
        axios.get(`${API_URL}/student-analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/student-analytics/performance?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/student-analytics/recommendations`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      setAnalytics(analyticsRes.data.data)
      setPerformance(performanceRes.data.data.performance_data)
      setRecommendations(recommendationsRes.data.data)
    } catch (error) {
      console.error("Failed to load analytics data:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/student-analytics/report?format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'student-analytics-report.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success("Report downloaded successfully!")
    } catch (error) {
      console.error("Failed to download report:", error)
      toast.error("Failed to download report")
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Analytics</h1>
          <p className="mt-2 text-gray-600">Track your progress and identify areas for improvement</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.total_assessments || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.average_score || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(analytics?.total_time_spent || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Strengths</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.strengths?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Strengths & Weaknesses */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">My Strengths</h3>
              </CardHeader>
              <CardContent>
                {analytics?.strengths?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-green-800">{strength.topic}</p>
                            <p className="text-sm text-green-600">{strength.question_type} • {strength.difficulty}</p>
                          </div>
                          <span className="text-sm font-medium text-green-700">
                            {Math.round((strength.score / strength.max_score) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No strengths identified yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Areas for Improvement</h3>
              </CardHeader>
              <CardContent>
                {analytics?.weaknesses?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-red-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-red-800">{weakness.topic}</p>
                            <p className="text-sm text-red-600">{weakness.question_type} • {weakness.difficulty}</p>
                          </div>
                          <span className="text-sm font-medium text-red-700">
                            {Math.round((weakness.score / weakness.max_score) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No areas for improvement identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Trend */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Performance Trend</h3>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {performance.length > 0 ? (
                <div className="space-y-3">
                  {/* Simple bar chart */}
                  {chartBars.map((b, idx) => (
                    <div key={idx} className="w-full">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{b.label}</span>
                        <span>{b.value}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded">
                        <div className="h-3 bg-blue-600 rounded" style={{ width: b.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No performance data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Learning Recommendations */}
        {recommendations && (
          <Card className="mt-8">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Learning Recommendations</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weak Areas */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Focus Areas</h4>
                  {recommendations.weak_areas?.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.weak_areas.map((area, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg">
                          <p className="font-medium text-blue-800">{area.topic}</p>
                          <p className="text-sm text-blue-600 mb-2">{area.performance}% performance</p>
                          <p className="text-xs text-blue-700">{area.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No specific focus areas identified</p>
                  )}
                </div>

                {/* Study Plan */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Study Plan</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2">Daily Practice</h5>
                      {recommendations.study_plan?.daily_practice?.map((practice, index) => (
                        <p key={index} className="text-sm text-green-700">
                          • {practice.topic}: {practice.focus} ({practice.time_allocation})
                        </p>
                      ))}
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h5 className="font-medium text-yellow-800 mb-2">Weekly Review</h5>
                      {recommendations.study_plan?.weekly_review?.map((review, index) => (
                        <p key={index} className="text-sm text-yellow-700">
                          • {review.topic}: {review.activity} - {review.goal}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Report Button */}
        <div className="mt-8 text-center">
          <button
            onClick={downloadReport}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download Analytics Report
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default StudentAnalytics