import db from "../DB/db.js";
import { getCreationModel, generateContent } from "../services/geminiService.js";

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
    console.log(`📊 Getting analytics for student ${studentId}`);

    // Get enrolled assessments (available for the dashboard)
    const enrolledAssessments = await db.query(`
      SELECT 
        a.id,
        a.title,
        a.prompt,
        e.enrolled_at
      FROM enrollments e
      JOIN assessments a ON e.assessment_id = a.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `, [studentId]);

    // Get all completed assessments
    const completedAssessments = await db.query(`
      SELECT 
        a.id,
        a.title,
        aa.completed_at AS submitted_at,
        aa.score AS percentage,
        EXTRACT(EPOCH FROM (aa.completed_at - aa.started_at)) AS time_taken
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.student_id = $1 
        AND aa.completed_at IS NOT NULL
        AND aa.status = 'completed'
      ORDER BY aa.completed_at ASC
    `, [studentId]);

    const assessments = completedAssessments.rows;
    const enrolled = enrolledAssessments.rows;

    const totalEnrolled = enrolled.length;
    const completedCount = assessments.length;

    if (completedCount === 0) {
      return {
        total_assessments: totalEnrolled,
        completed_assessments: 0,
        average_score: 0,
        total_time_spent: 0,
        enrolled_assessments: enrolled,
        progress_trend: [],
        strengths: [],
        weaknesses: [],
        recent_performance: [],
        subject_breakdown: []
      };
    }

    const averageScore = assessments.reduce((sum, a) => sum + (a.percentage || 0), 0) / completedCount;
    const totalTimeSpent = assessments.reduce((sum, a) => sum + (a.time_taken || 0), 0);

    const progressTrend = assessments.slice(-10).map((a, index) => ({
      assessment_id: a.id,
      title: a.title,
      score: a.percentage || 0,
      date: a.submitted_at,
      trend_index: index + 1
    }));

    const recentPerformance = assessments.slice(-5).map(a => ({
      assessment_id: a.id,
      title: a.title,
      score: a.percentage || 0,
      grade: null,
      date: a.submitted_at,
      time_taken: a.time_taken
    }));

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
    `, [studentId]);

    const strengths = [];
    const weaknesses = [];
    const subjectBreakdown = {};

    questionAnalysis.rows.forEach(q => {
      const topic = q.question_type || 'General';
      const questionType = q.question_type || 'multiple_choice';
      const difficulty = 'medium';

      if (!subjectBreakdown[topic]) {
        subjectBreakdown[topic] = {
          total_questions: 0,
          correct_answers: 0,
          average_score: 0
        };
      }
      subjectBreakdown[topic].total_questions++;
      subjectBreakdown[topic].correct_answers += q.scored_marks || 0;

      if (q.performance_category === 'strength') {
        strengths.push({
          topic,
          question_type: questionType,
          difficulty,
          score: q.scored_marks,
          max_score: q.marks
        });
      } else if (q.performance_category === 'weakness') {
        weaknesses.push({
          topic,
          question_type: questionType,
          difficulty,
          score: q.scored_marks,
          max_score: q.marks
        });
      }
    });

    Object.keys(subjectBreakdown).forEach(topic => {
      const breakdown = subjectBreakdown[topic];
      breakdown.average_score = breakdown.total_questions > 0 
        ? Math.round((breakdown.correct_answers / breakdown.total_questions) * 100) 
        : 0;
    });

    const topStrengths = strengths
      .sort((a, b) => (b.score / b.max_score) - (a.score / a.max_score))
      .slice(0, 3);

    const topWeaknesses = weaknesses
      .sort((a, b) => (a.score / a.max_score) - (b.score / b.max_score))
      .slice(0, 3);

    return {
      total_assessments: totalEnrolled,
      completed_assessments: completedCount,
      average_score: Math.round(averageScore),
      total_time_spent: totalTimeSpent,
      enrolled_assessments: enrolled,
      progress_trend: progressTrend,
      strengths: topStrengths,
      weaknesses: topWeaknesses,
      recent_performance: recentPerformance,
      subject_breakdown: Object.entries(subjectBreakdown).map(([topic, data]) => ({
        topic,
        total_questions: data.total_questions,
        average_score: data.average_score
      }))
    };
  } catch (error) {
    console.error("❌ getStudentAnalytics error:", error);
    throw error;
  }
};

/**
 * Get student's performance over time
 * @param {number} studentId - Student ID
 * @param {string} timeRange - 'week', 'month', or 'year'
 * @returns {Array} Performance data points
 */
export const getPerformanceOverTime = async (studentId, timeRange) => {
  try {
    let dateFilter = "";
    switch (timeRange) {
      case 'week':
        dateFilter = "AND aa.completed_at >= NOW() - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND aa.completed_at >= NOW() - INTERVAL '30 days'";
        break;
      case 'year':
        dateFilter = "AND aa.completed_at >= NOW() - INTERVAL '1 year'";
        break;
      default:
        dateFilter = "";
    }

    const query = `
      SELECT 
        DATE(aa.completed_at) as date,
        AVG(aa.score) as average_score,
        COUNT(*) as assessments_taken,
        SUM(EXTRACT(EPOCH FROM (aa.completed_at - aa.started_at))) as total_time
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessment_id = a.id
      WHERE aa.student_id = $1 
        AND aa.completed_at IS NOT NULL
        AND aa.status = 'completed'
        ${dateFilter}
      GROUP BY DATE(aa.completed_at)
      ORDER BY date ASC
    `;

    const result = await db.query(query, [studentId]);
    return result.rows;
  } catch (error) {
    console.error("❌ Error getting performance over time:", error);
    throw error;
  }
};

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
    `, [studentId]);

    // Use AI to generate personalized suggestions
    const client = await getCreationModel();
    const prompt = `Generate learning recommendations for a student with weak areas: ${JSON.stringify(weakAreas.rows)}. Provide a JSON object with weak_areas (array of objects with topic, performance, suggestion) and study_plan (object with daily_practice and weekly_review arrays).`;
    const responseText = await generateContent(client, prompt, {
      generationConfig: { maxOutputTokens: 1000, temperature: 0.5 },
      thinkingConfig: { thinkingBudget: 0 },
    });

    console.log(`Debug: Full response text: ${responseText.substring(0, 100)}${responseText.length > 100 ? "..." : ""}`);
    let aiRecommendations = {};
    try {
      // Extract JSON from response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch && jsonMatch[0]) {
        aiRecommendations = JSON.parse(jsonMatch[0]);
      } else {
        console.warn("No valid JSON found in response, using fallback plan");
        aiRecommendations = { weak_areas: [], study_plan: {} };
      }
    } catch (parseError) {
      console.error("❌ AI recommendation parsing error:", parseError);
      console.log("Falling back to default recommendations");
      aiRecommendations = { weak_areas: [], study_plan: {} };
    }

    const recommendations = weakAreas.rows.map(area => ({
      topic: area.question_type || 'General',
      question_type: area.question_type,
      difficulty: 'medium',
      performance: Math.round(area.average_performance * 100),
      suggestion: aiRecommendations.weak_areas?.find(r => r.topic === area.question_type)?.suggestion || getSuggestionForArea(area.question_type, 'medium')
    }));

    return {
      weak_areas: recommendations,
      study_plan: aiRecommendations.study_plan || generateStudyPlan(recommendations),
      next_assessments: await getRecommendedAssessments(studentId)
    };
  } catch (error) {
    console.error("❌ Error getting learning recommendations:", error);
    throw error;
  }
};

/**
 * Get suggestion for weak area (fallback if AI fails)
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
  };

  return suggestions[questionType]?.[difficulty] || "Practice more questions in this area";
};

/**
 * Generate study plan based on weak areas (fallback if AI fails)
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
  };

  return plan;
};

/**
 * Get recommended assessments for student
 */
const getRecommendedAssessments = async (studentId) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.title,
        a.prompt as description,
        NULL as duration,
        NULL as total_marks
      FROM enrollments e
      JOIN assessments a ON e.assessment_id = a.id
      WHERE e.student_id = $1 
        AND a.id NOT IN (
          SELECT DISTINCT assessment_id 
          FROM assessment_attempts 
          WHERE student_id = $1 AND completed_at IS NOT NULL
        )
      ORDER BY a.created_at DESC
      LIMIT 3
    `;

    const result = await db.query(query, [studentId]);
    return result.rows;
  } catch (error) {
    console.error("❌ Error getting recommended assessments:", error);
    return [];
  }
};