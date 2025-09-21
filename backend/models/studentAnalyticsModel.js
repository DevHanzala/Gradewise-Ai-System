import db from "../DB/db.js"

/**
 * Student Analytics Model
 * Handles student progress tracking, performance analysis, and strengths/weaknesses
 */

/**
 * Get student's overall performance analytics
 * @param {number} studentId - Student ID
 * @returns {Object} Student analytics data
 */
export const getStudentAnalytics = async (studentId) => {
  try {
    console.log(`📊 Getting analytics for student ${studentId}`)

    // Check if tables exist first
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_attempts'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      return {
        total_assessments: 0,
        average_score: 0,
        total_time_spent: 0,
        progress_trend: [],
        strengths: [],
        weaknesses: [],
        recent_performance: [],
        subject_breakdown: []
      }
    }

    // Get all completed assessments
    const completedAssessments = await db.query(`
      SELECT 
        a.id,
        a.title,
        a.total_marks,
        aa.completed_at AS submitted_at,
        aa.score AS percentage, -- Assuming score is percentage or will be calculated
        aa.time_taken
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.student_id = $1 
        AND aa.completed_at IS NOT NULL
        AND aa.status = 'completed'
      ORDER BY aa.completed_at ASC
    `, [studentId])

    const assessments = completedAssessments.rows

    if (assessments.length === 0) {
      return {
        total_assessments: 0,
        average_score: 0,
        total_time_spent: 0,
        progress_trend: [],
        strengths: [],
        weaknesses: [],
        recent_performance: [],
        subject_breakdown: []
      }
    }

    // Calculate overall metrics
    const totalAssessments = assessments.length
    const averageScore = assessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / totalAssessments
    const totalTimeSpent = assessments.reduce((sum, a) => sum + (a.time_taken || 0), 0)

    // Get progress trend (last 10 assessments)
    const progressTrend = assessments.slice(-10).map((a, index) => ({
      assessment_id: a.id,
      title: a.title,
      score: a.percentage || 0,
      date: a.submitted_at,
      trend_index: index + 1
    }))

    // Get recent performance (last 5 assessments)
    const recentPerformance = assessments.slice(-5).map(a => ({
      assessment_id: a.id,
      title: a.title,
      score: a.percentage || 0,
      grade: null, // No grade column, can be added if needed
      date: a.submitted_at,
      time_taken: a.time_taken
    }))

    // Get question-level analysis for strengths/weaknesses
    const questionAnalysis = await db.query(`
      SELECT 
        gq.question_type,
        sa.score AS scored_marks,
        gq.marks,
        CASE 
          WHEN sa.score >= gq.marks * 0.8 THEN 'strength'
          WHEN sa.score <= gq.marks * 0.4 THEN 'weakness'
          ELSE 'average'
        END as performance_category
      FROM student_answers sa
      JOIN generated_questions gq ON sa.question_id = gq.id
      JOIN assessment_attempts aa ON sa.attempt_id = aa.id
      WHERE aa.student_id = $1 
        AND aa.completed_at IS NOT NULL
        AND sa.score IS NOT NULL
    `, [studentId])

    // Analyze strengths and weaknesses
    const strengths = []
    const weaknesses = []
    const subjectBreakdown = {}

    questionAnalysis.rows.forEach(q => {
      const topic = q.question_type || 'General' // Using question_type as a proxy for topic since topics aren't in generated_questions
      const questionType = q.question_type || 'multiple_choice'
      const difficulty = 'medium' // No difficulty_level, defaulting to medium

      // Track by topic
      if (!subjectBreakdown[topic]) {
        subjectBreakdown[topic] = {
          total_questions: 0,
          correct_answers: 0,
          average_score: 0
        }
      }
      subjectBreakdown[topic].total_questions++
      subjectBreakdown[topic].correct_answers += q.scored_marks || 0

      // Categorize as strength or weakness
      if (q.performance_category === 'strength') {
        strengths.push({
          topic,
          question_type: questionType,
          difficulty,
          score: q.scored_marks,
          max_score: q.marks
        })
      } else if (q.performance_category === 'weakness') {
        weaknesses.push({
          topic,
          question_type: questionType,
          difficulty,
          score: q.scored_marks,
          max_score: q.marks
        })
      }
    })

    // Calculate subject breakdown percentages
    Object.keys(subjectBreakdown).forEach(topic => {
      const breakdown = subjectBreakdown[topic]
      breakdown.average_score = breakdown.total_questions > 0 
        ? Math.round((breakdown.correct_answers / breakdown.total_questions) * 100) 
        : 0
    })

    // Get top 3 strengths and weaknesses
    const topStrengths = strengths
      .sort((a, b) => (b.score / b.max_score) - (a.score / a.max_score))
      .slice(0, 3)

    const topWeaknesses = weaknesses
      .sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score))
      .slice(0, 3)

    return {
      total_assessments: totalAssessments,
      average_score: Math.round(averageScore * 100) / 100,
      total_time_spent: totalTimeSpent,
      progress_trend: progressTrend,
      strengths: topStrengths,
      weaknesses: topWeaknesses,
      recent_performance: recentPerformance,
      subject_breakdown: Object.entries(subjectBreakdown).map(([topic, data]) => ({
        topic,
        ...data
      }))
    }
  } catch (error) {
    console.error("❌ Error getting student analytics:", error)
    throw error
  }
}

/**
 * Get student's performance over time
 * @param {number} studentId - Student ID
 * @param {string} timeRange - Time range (week, month, year)
 * @returns {Array} Performance data points
 */
export const getPerformanceOverTime = async (studentId, timeRange = 'month') => {
  try {
    // Check if tables exist first
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_attempts'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      return []
    }

    let dateFilter
    switch (timeRange) {
      case 'week':
        dateFilter = "AND aa.completed_at >= NOW() - INTERVAL '7 days'"
        break
      case 'month':
        dateFilter = "AND aa.completed_at >= NOW() - INTERVAL '30 days'"
        break
      case 'year':
        dateFilter = "AND aa.completed_at >= NOW() - INTERVAL '1 year'"
        break
      default:
        dateFilter = ""
    }

    const query = `
      SELECT 
        DATE(aa.completed_at) as date,
        AVG(aa.score * 100.0 / a.total_marks) as average_score, -- Calculate percentage
        COUNT(*) as assessments_taken,
        SUM(aa.time_taken) as total_time
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.student_id = $1 
        AND aa.completed_at IS NOT NULL
        AND aa.status = 'completed'
        ${dateFilter}
      GROUP BY DATE(aa.completed_at)
      ORDER BY date ASC
    `

    const result = await db.query(query, [studentId])
    return result.rows
  } catch (error) {
    console.error("❌ Error getting performance over time:", error)
    throw error
  }
}

/**
 * Get student's learning recommendations
 * @param {number} studentId - Student ID
 * @returns {Object} Learning recommendations
 */
export const getLearningRecommendations = async (studentId) => {
  try {
    // Get weak areas
    const weakAreas = await db.query(`
      SELECT 
        gq.question_type,
        COUNT(*) as question_count,
        AVG(sa.score * 1.0 / gq.marks) as average_performance
      FROM student_answers sa
      JOIN generated_questions gq ON sa.question_id = gq.id
      JOIN assessment_attempts aa ON sa.attempt_id = aa.id
      WHERE aa.student_id = $1 
        AND aa.completed_at IS NOT NULL
        AND sa.score IS NOT NULL
        AND sa.score < gq.marks * 0.6
      GROUP BY gq.question_type
      ORDER BY average_performance ASC
      LIMIT 5
    `, [studentId])

    // Get improvement suggestions
    const recommendations = weakAreas.rows.map(area => ({
      topic: area.question_type || 'General', // Using question_type as topic proxy
      question_type: area.question_type,
      difficulty: 'medium', // No difficulty_level, defaulting to medium
      performance: Math.round(area.average_performance * 100),
      suggestion: getSuggestionForArea(area.question_type, 'medium')
    }))

    return {
      weak_areas: recommendations,
      study_plan: generateStudyPlan(recommendations),
      next_assessments: await getRecommendedAssessments(studentId)
    }
  } catch (error) {
    console.error("❌ Error getting learning recommendations:", error)
    throw error
  }
}

/**
 * Get suggestion for weak area
 */
const getSuggestionForArea = (questionType, difficulty) => {
  const suggestions = {
    multiple_choice: {
      easy: "Practice basic concepts and eliminate obvious wrong answers",
      medium: "Focus on understanding key concepts and common distractors",
      hard: "Deep dive into complex scenarios and edge cases"
    },
    true_false: {
      easy: "Review fundamental facts and definitions",
      medium: "Practice identifying subtle nuances in statements",
      hard: "Focus on complex logical reasoning"
    },
    short_answer: {
      easy: "Practice concise writing and key term identification",
      medium: "Work on structured responses and evidence-based answers",
      hard: "Develop analytical thinking and comprehensive explanations"
    },
    essay: {
      easy: "Practice basic essay structure and organization",
      medium: "Focus on argument development and evidence integration",
      hard: "Work on critical analysis and synthesis of complex ideas"
    }
  }

  return suggestions[questionType]?.[difficulty] || "Practice more questions in this area"
}

/**
 * Generate study plan based on weak areas
 */
const generateStudyPlan = (weakAreas) => {
  const plan = {
    daily_practice: weakAreas.slice(0, 2).map(area => ({
      topic: area.topic,
      focus: area.suggestion,
      time_allocation: "30 minutes"
    })),
    weekly_review: weakAreas.slice(0, 3).map(area => ({
      topic: area.topic,
      activity: "Practice test",
      goal: `Improve ${area.topic} performance by 20%`
    })),
    monthly_assessment: "Take a comprehensive assessment to measure progress"
  }

  return plan
}

/**
 * Get recommended assessments for student
 */
const getRecommendedAssessments = async (studentId) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.duration,
        a.total_marks
      FROM assessments a
      JOIN assessment_enrollments ae ON a.id = ae.assessment_id
      WHERE ae.student_id = $1 
        AND a.is_published = true
        AND (a.end_date IS NULL OR a.end_date > NOW())
        AND a.id NOT IN (
          SELECT DISTINCT assessment_id 
          FROM assessment_attempts 
          WHERE student_id = $1 AND completed_at IS NOT NULL
        )
      ORDER BY a.created_at DESC
      LIMIT 3
    `

    const result = await db.query(query, [studentId])
    return result.rows
  } catch (error) {
    console.error("❌ Error getting recommended assessments:", error)
    return []
  }
}