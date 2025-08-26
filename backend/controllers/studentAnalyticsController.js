import {
  getStudentAnalytics,
  getPerformanceOverTime,
  getLearningRecommendations
} from "../models/studentAnalyticsModel.js"

/**
 * Student Analytics Controller
 * Handles API endpoints for student progress tracking and performance analysis
 */

/**
 * Get student's overall analytics
 * @route GET /api/student-analytics/overview
 */
export const getStudentOverview = async (req, res) => {
  try {
    const studentId = req.user.id

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access their analytics"
      })
    }

    console.log(`📊 Getting analytics overview for student ${studentId}`)

    const analytics = await getStudentAnalytics(studentId)

    res.status(200).json({
      success: true,
      message: "Student analytics retrieved successfully",
      data: analytics
    })
  } catch (error) {
    console.error("❌ Get student overview error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve student analytics",
      error: error.message
    })
  }
}

/**
 * Get student's performance over time
 * @route GET /api/student-analytics/performance
 */
export const getStudentPerformance = async (req, res) => {
  try {
    const studentId = req.user.id
    const { timeRange = 'month' } = req.query

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access their performance data"
      })
    }

    console.log(`📈 Getting performance data for student ${studentId} (${timeRange})`)

    const performance = await getPerformanceOverTime(studentId, timeRange)

    res.status(200).json({
      success: true,
      message: "Performance data retrieved successfully",
      data: {
        time_range: timeRange,
        performance_data: performance
      }
    })
  } catch (error) {
    console.error("❌ Get student performance error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve performance data",
      error: error.message
    })
  }
}

/**
 * Get student's learning recommendations
 * @route GET /api/student-analytics/recommendations
 */
export const getStudentRecommendations = async (req, res) => {
  try {
    const studentId = req.user.id

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access their recommendations"
      })
    }

    console.log(`🎯 Getting learning recommendations for student ${studentId}`)

    const recommendations = await getLearningRecommendations(studentId)

    res.status(200).json({
      success: true,
      message: "Learning recommendations retrieved successfully",
      data: recommendations
    })
  } catch (error) {
    console.error("❌ Get student recommendations error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve learning recommendations",
      error: error.message
    })
  }
}

/**
 * Get student's detailed analytics report
 * @route GET /api/student-analytics/report
 */
export const getStudentReport = async (req, res) => {
  try {
    const studentId = req.user.id
    const { format = 'json' } = req.query

    // Validate user role
    if (req.user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can access their reports"
      })
    }

    console.log(`📋 Generating detailed report for student ${studentId}`)

    // Get all analytics data
    const [analytics, performance, recommendations] = await Promise.all([
      getStudentAnalytics(studentId),
      getPerformanceOverTime(studentId, 'month'),
      getLearningRecommendations(studentId)
    ])

    const report = {
      student_id: studentId,
      generated_at: new Date().toISOString(),
      overview: analytics,
      performance_trend: performance,
      recommendations: recommendations,
      summary: {
        total_assessments_completed: analytics.total_assessments,
        average_performance: analytics.average_score,
        improvement_areas: recommendations.weak_areas.length,
        strengths_count: analytics.strengths.length
      }
    }

    // Handle different formats
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(report)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="student-report-${studentId}.csv"`)
      return res.send(csvData)
    }

    res.status(200).json({
      success: true,
      message: "Student report generated successfully",
      data: report
    })
  } catch (error) {
    console.error("❌ Get student report error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to generate student report",
      error: error.message
    })
  }
}

/**
 * Convert report data to CSV format
 */
const convertToCSV = (report) => {
  const headers = [
    'Metric',
    'Value',
    'Description'
  ]

  const rows = [
    ['Total Assessments', report.overview.total_assessments, 'Number of completed assessments'],
    ['Average Score', `${report.overview.average_score}%`, 'Average performance across all assessments'],
    ['Total Time Spent', `${Math.round(report.overview.total_time_spent / 60)} minutes`, 'Total time spent on assessments'],
    ['Strengths', report.overview.strengths.length, 'Number of identified strengths'],
    ['Weaknesses', report.overview.weaknesses.length, 'Number of areas needing improvement'],
    ['Recommendations', report.recommendations.weak_areas.length, 'Number of learning recommendations']
  ]

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}
