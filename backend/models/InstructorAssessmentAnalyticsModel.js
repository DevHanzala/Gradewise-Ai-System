import db from "../DB/db.js";

/**
 * Instructor Assessment Analytics Model
 */

/**
 * Fetch executed assessments for an instructor
 */
export const getInstructorExecutedAssessmentsModel = async (instructorId) => {
  const result = await db.query(
    `SELECT a.id, a.title, a.created_at, COUNT(aa.id) as completed_attempts
     FROM assessments a
     LEFT JOIN assessment_attempts aa ON a.id = aa.assessment_id
     WHERE a.instructor_id = $1
       AND aa.completed_at IS NOT NULL
       AND aa.status = 'completed'
     GROUP BY a.id, a.title, a.created_at
     HAVING COUNT(aa.id) > 0`,
    [instructorId]
  );
  return result.rows;
};

/**
 * Fetch students who completed a specific assessment
 */
export const getAssessmentStudentsModel = async (assessmentId, instructorId) => {
  try {
    // Calculate total max score from generated_questions
    const maxScoreResult = await db.query(
      `SELECT COALESCE(SUM(marks), 0) as max_score
       FROM generated_questions gq
       JOIN assessment_attempts aa ON aa.id = gq.attempt_id
       JOIN assessments a ON a.id = aa.assessment_id
       WHERE a.id = $1 AND a.instructor_id = $2`,
      [assessmentId, instructorId]
    );
    const maxScore = maxScoreResult.rows[0].max_score || 0;

    // Fetch student data with calculated metrics
    const result = await db.query(
      `SELECT aa.student_id, u.name, aa.started_at, aa.completed_at, 
              COALESCE(SUM(sa.score), 0) as obtained_score, aa.status,
              (SELECT COUNT(DISTINCT question_id) 
               FROM student_answers sa2 
               WHERE sa2.attempt_id = aa.id) as total_questions,
              (SELECT COUNT(*) 
               FROM student_answers sa2 
               WHERE sa2.attempt_id = aa.id AND sa2.is_correct = true) as correct_answers
       FROM assessment_attempts aa
       JOIN assessments a ON a.id = aa.assessment_id
       JOIN users u ON u.id = aa.student_id
       LEFT JOIN student_answers sa ON sa.attempt_id = aa.id
       WHERE a.id = $1
         AND a.instructor_id = $2
         AND aa.completed_at IS NOT NULL
         AND aa.status = 'completed'
       GROUP BY aa.id, aa.student_id, u.name, aa.started_at, aa.completed_at, aa.status`,
      [assessmentId, instructorId]
    );
    return result.rows.map(row => {
      const timeDiff = row.completed_at ? Math.round((new Date(row.completed_at) - new Date(row.started_at)) / 1000) : 0;
      const minutes = Math.floor(timeDiff / 60);
      const seconds = timeDiff % 60;
      const percentage = maxScore > 0 ? (Number(row.obtained_score) / maxScore) * 100 : 0;
      return {
        ...row,
        time_taken: timeDiff,
        percentage: Number(percentage.toFixed(2)),
        time_used: `${minutes} min ${seconds} sec`
      };
    });
  } catch (error) {
    console.error("❌ Model error fetching students:", error.message);
    return [];
  }
};