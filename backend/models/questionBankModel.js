import db from "../DB/db.js"

/**
 * Question Bank Model
 * Handles saving, searching, tagging, and importing generated questions
 */

/**
 * Save question to question bank
 * @param {Object} questionData - Question data to save
 * @param {number} instructorId - Instructor who owns the question
 * @returns {Object} Saved question
 */
export const saveQuestionToBank = async (questionData, instructorId) => {
  try {
    console.log(`💾 Saving question to bank for instructor ${instructorId}`)

    const {
      question_text,
      question_type,
      difficulty_level,
      topics,
      options,
      correct_answer,
      explanation,
      marks_per_question,
      tags = []
    } = questionData

    // Insert into question bank
    const result = await db.query(
      `INSERT INTO question_bank (
        instructor_id,
        question_text,
        question_type,
        difficulty_level,
        topics,
        options,
        correct_answer,
        explanation,
        marks_per_question,
        tags,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        instructorId,
        question_text,
        question_type,
        difficulty_level,
        topics,
        options,
        correct_answer,
        explanation,
        marks_per_question,
        tags
      ]
    )

    const savedQuestion = result.rows[0]
    console.log(`✅ Question saved to bank with ID: ${savedQuestion.id}`)

    return savedQuestion
  } catch (error) {
    console.error("❌ Error saving question to bank:", error)
    throw error
  }
}

/**
 * Search questions in question bank
 * @param {Object} searchParams - Search parameters
 * @param {number} instructorId - Instructor ID
 * @returns {Array} Matching questions
 */
export const searchQuestionBank = async (searchParams, instructorId) => {
  try {
    console.log(`🔍 Searching question bank for instructor ${instructorId}`)

    const {
      query = "",
      question_type,
      difficulty_level,
      topics = [],
      tags = [],
      page = 1,
      limit = 20
    } = searchParams

    let whereConditions = ["qb.instructor_id = $1"]
    let params = [instructorId]
    let paramIndex = 2

    // Text search
    if (query) {
      whereConditions.push(`(qb.question_text ILIKE $${paramIndex} OR qb.explanation ILIKE $${paramIndex})`)
      params.push(`%${query}%`)
      paramIndex++
    }

    // Question type filter
    if (question_type) {
      whereConditions.push(`qb.question_type = $${paramIndex}`)
      params.push(question_type)
      paramIndex++
    }

    // Difficulty level filter
    if (difficulty_level) {
      whereConditions.push(`qb.difficulty_level = $${paramIndex}`)
      params.push(difficulty_level)
      paramIndex++
    }

    // Topics filter
    if (topics.length > 0) {
      const topicConditions = topics.map((_, index) => `$${paramIndex + index}`)
      whereConditions.push(`qb.topics && ARRAY[${topicConditions.join(', ')}]`)
      params.push(...topics)
      paramIndex += topics.length
    }

    // Tags filter
    if (tags.length > 0) {
      const tagConditions = tags.map((_, index) => `$${paramIndex + index}`)
      whereConditions.push(`qb.tags && ARRAY[${tagConditions.join(', ')}]`)
      params.push(...tags)
      paramIndex += tags.length
    }

    const whereClause = whereConditions.join(" AND ")

    // Count total results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM question_bank qb
      WHERE ${whereClause}
    `
    const countResult = await db.query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Get paginated results
    const offset = (page - 1) * limit
    const searchQuery = `
      SELECT 
        qb.*,
        COUNT(qa.id) as usage_count
      FROM question_bank qb
      LEFT JOIN question_assignments qa ON qb.id = qa.question_bank_id
      WHERE ${whereClause}
      GROUP BY qb.id
      ORDER BY qb.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const result = await db.query(searchQuery, params)

    return {
      questions: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error("❌ Error searching question bank:", error)
    throw error
  }
}

/**
 * Get question by ID from bank
 * @param {number} questionId - Question ID
 * @param {number} instructorId - Instructor ID
 * @returns {Object} Question data
 */
export const getQuestionFromBank = async (questionId, instructorId) => {
  try {
    console.log(`📖 Getting question ${questionId} from bank`)

    const result = await db.query(
      `SELECT 
        qb.*,
        COUNT(qa.id) as usage_count,
        ARRAY_AGG(DISTINCT a.title) as used_in_assessments
      FROM question_bank qb
      LEFT JOIN question_assignments qa ON qb.id = qa.question_bank_id
      LEFT JOIN assessments a ON qa.assessment_id = a.id
      WHERE qb.id = $1 AND qb.instructor_id = $2
      GROUP BY qb.id`,
      [questionId, instructorId]
    )

    if (result.rows.length === 0) {
      throw new Error("Question not found")
    }

    return result.rows[0]
  } catch (error) {
    console.error("❌ Error getting question from bank:", error)
    throw error
  }
}

/**
 * Update question in bank
 * @param {number} questionId - Question ID
 * @param {Object} updateData - Data to update
 * @param {number} instructorId - Instructor ID
 * @returns {Object} Updated question
 */
export const updateQuestionInBank = async (questionId, updateData, instructorId) => {
  try {
    console.log(`✏️ Updating question ${questionId} in bank`)

    const allowedFields = [
      'question_text',
      'question_type',
      'difficulty_level',
      'topics',
      'options',
      'correct_answer',
      'explanation',
      'marks_per_question',
      'tags'
    ]

    const updateFields = []
    const params = []
    let paramIndex = 1

    // Build update query dynamically
    for (const [field, value] of Object.entries(updateData)) {
      if (allowedFields.includes(field) && value !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update")
    }

    updateFields.push(`updated_at = NOW()`)
    params.push(questionId, instructorId)

    const result = await db.query(
      `UPDATE question_bank 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND instructor_id = $${paramIndex + 1}
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      throw new Error("Question not found or you don't have permission to update it")
    }

    return result.rows[0]
  } catch (error) {
    console.error("❌ Error updating question in bank:", error)
    throw error
  }
}

/**
 * Delete question from bank
 * @param {number} questionId - Question ID
 * @param {number} instructorId - Instructor ID
 * @returns {boolean} Success status
 */
export const deleteQuestionFromBank = async (questionId, instructorId) => {
  try {
    console.log(`🗑️ Deleting question ${questionId} from bank`)

    const result = await db.query(
      "DELETE FROM question_bank WHERE id = $1 AND instructor_id = $2 RETURNING id",
      [questionId, instructorId]
    )

    if (result.rows.length === 0) {
      throw new Error("Question not found or you don't have permission to delete it")
    }

    return true
  } catch (error) {
    console.error("❌ Error deleting question from bank:", error)
    throw error
  }
}

/**
 * Import questions from assessment to question bank
 * @param {number} assessmentId - Assessment ID
 * @param {number} instructorId - Instructor ID
 * @param {Array} questionIds - Array of question IDs to import
 * @returns {Object} Import results
 */
export const importQuestionsToBank = async (assessmentId, instructorId, questionIds) => {
  try {
    console.log(`📥 Importing ${questionIds.length} questions to bank from assessment ${assessmentId}`)

    // Get questions from assessment
    const questionsResult = await db.query(
      `SELECT 
        q.*,
        qb.id as bank_id
      FROM questions q
      LEFT JOIN question_bank qb ON q.question_text = qb.question_text AND qb.instructor_id = $1
      WHERE q.assessment_id = $2 AND q.id = ANY($3)`,
      [instructorId, assessmentId, questionIds]
    )

    const results = {
      imported: [],
      skipped: [],
      errors: []
    }

    for (const question of questionsResult.rows) {
      try {
        // Skip if already in bank
        if (question.bank_id) {
          results.skipped.push({
            question_id: question.id,
            reason: "Already exists in question bank"
          })
          continue
        }

        // Prepare question data for bank
        const bankQuestionData = {
          question_text: question.question_text,
          question_type: question.question_type,
          difficulty_level: question.difficulty_level,
          topics: question.topics,
          options: question.options,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          marks_per_question: question.marks_per_question,
          tags: [`imported-from-assessment-${assessmentId}`]
        }

        // Save to bank
        const savedQuestion = await saveQuestionToBank(bankQuestionData, instructorId)

        // Create assignment record
        await db.query(
          "INSERT INTO question_assignments (question_bank_id, assessment_id, assigned_at) VALUES ($1, $2, NOW())",
          [savedQuestion.id, assessmentId]
        )

        results.imported.push({
          question_id: question.id,
          bank_id: savedQuestion.id
        })

      } catch (error) {
        results.errors.push({
          question_id: question.id,
          error: error.message
        })
      }
    }

    return results
  } catch (error) {
    console.error("❌ Error importing questions to bank:", error)
    throw error
  }
}

/**
 * Get question bank statistics
 * @param {number} instructorId - Instructor ID
 * @returns {Object} Statistics
 */
export const getQuestionBankStats = async (instructorId) => {
  try {
    console.log(`📊 Getting question bank stats for instructor ${instructorId}`)

    const statsQuery = `
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN question_type = 'multiple_choice' THEN 1 END) as mc_questions,
        COUNT(CASE WHEN question_type = 'true_false' THEN 1 END) as tf_questions,
        COUNT(CASE WHEN question_type = 'short_answer' THEN 1 END) as sa_questions,
        COUNT(CASE WHEN question_type = 'essay' THEN 1 END) as essay_questions,
        COUNT(CASE WHEN difficulty_level = 'easy' THEN 1 END) as easy_questions,
        COUNT(CASE WHEN difficulty_level = 'medium' THEN 1 END) as medium_questions,
        COUNT(CASE WHEN difficulty_level = 'hard' THEN 1 END) as hard_questions,
        COUNT(DISTINCT unnest(topics)) as unique_topics,
        COUNT(DISTINCT unnest(tags)) as unique_tags
      FROM question_bank
      WHERE instructor_id = $1
    `

    const result = await db.query(statsQuery, [instructorId])
    return result.rows[0]
  } catch (error) {
    console.error("❌ Error getting question bank stats:", error)
    throw error
  }
}

/**
 * Get popular tags from question bank
 * @param {number} instructorId - Instructor ID
 * @param {number} limit - Number of tags to return
 * @returns {Array} Popular tags
 */
export const getPopularTags = async (instructorId, limit = 10) => {
  try {
    console.log(`🏷️ Getting popular tags for instructor ${instructorId}`)

    const result = await db.query(
      `SELECT 
        tag,
        COUNT(*) as usage_count
      FROM question_bank,
      UNNEST(tags) as tag
      WHERE instructor_id = $1
      GROUP BY tag
      ORDER BY usage_count DESC
      LIMIT $2`,
      [instructorId, limit]
    )

    return result.rows
  } catch (error) {
    console.error("❌ Error getting popular tags:", error)
    throw error
  }
}
