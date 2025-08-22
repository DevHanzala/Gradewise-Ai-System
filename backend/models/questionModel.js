import pool from "../DB/db.js"

/**
 * Create a new question
 */
export const createQuestion = async (questionData) => {
  const {
    assessment_id,
    question_text,
    question_type,
    options,
    correct_answer,
    explanation,
    marks,
    difficulty_level,
    tags,
    question_order,
  } = questionData

  try {
    const query = `
      INSERT INTO questions (
        assessment_id, question_text, question_type, options, correct_answer, 
        explanation, marks, difficulty_level, tags, question_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `

    const values = [
      assessment_id,
      question_text,
      question_type,
      typeof options === "object" ? JSON.stringify(options) : options,
      correct_answer,
      explanation,
      marks || 1,
      difficulty_level || "medium",
      tags || [],
      question_order || 1,
    ]

    const result = await pool.query(query, values)
    const question = result.rows[0]

    // Parse JSON fields
    if (question.options && typeof question.options === "string") {
      try {
        question.options = JSON.parse(question.options)
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return question
  } catch (error) {
    throw error
  }
}

/**
 * Get questions by assessment ID
 */
export const getQuestionsByAssessment = async (assessmentId) => {
  try {
    const query = `
      SELECT * FROM questions 
      WHERE assessment_id = $1 AND is_active = true
      ORDER BY question_order ASC, created_at ASC
    `

    const result = await pool.query(query, [assessmentId])

    // Parse JSON fields for each question
    const questions = result.rows.map((question) => {
      if (question.options && typeof question.options === "string") {
        try {
          question.options = JSON.parse(question.options)
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
      return question
    })

    return questions
  } catch (error) {
    throw error
  }
}

/**
 * Get question by ID
 */
export const getQuestionById = async (id) => {
  try {
    const query = `
      SELECT q.*, a.title as assessment_title, a.instructor_id
      FROM questions q
      JOIN assessments a ON q.assessment_id = a.id
      WHERE q.id = $1 AND q.is_active = true
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    const question = result.rows[0]

    // Parse JSON fields
    if (question.options && typeof question.options === "string") {
      try {
        question.options = JSON.parse(question.options)
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return question
  } catch (error) {
    throw error
  }
}

/**
 * Update question
 */
export const updateQuestion = async (id, updateData) => {
  try {
    const fields = []
    const values = []
    let paramCount = 0

    const allowedFields = [
      "question_text",
      "question_type",
      "options",
      "correct_answer",
      "explanation",
      "marks",
      "difficulty_level",
      "tags",
      "question_order",
    ]

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        paramCount++
        if (key === "options" && typeof updateData[key] === "object") {
          fields.push(`${key} = $${paramCount}`)
          values.push(JSON.stringify(updateData[key]))
        } else {
          fields.push(`${key} = $${paramCount}`)
          values.push(updateData[key])
        }
      }
    })

    if (fields.length === 0) {
      throw new Error("No valid fields to update")
    }

    paramCount++
    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE questions 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount} AND is_active = true
      RETURNING *
    `

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return null
    }

    const question = result.rows[0]

    // Parse JSON fields
    if (question.options && typeof question.options === "string") {
      try {
        question.options = JSON.parse(question.options)
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return question
  } catch (error) {
    throw error
  }
}

/**
 * Delete question (soft delete)
 */
export const deleteQuestion = async (id) => {
  try {
    const query = `
      UPDATE questions 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `

    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Hard delete question
 */
export const hardDeleteQuestion = async (id) => {
  try {
    // Delete related student answers first
    await pool.query("DELETE FROM student_answers WHERE question_id = $1", [id])

    // Delete the question
    const query = "DELETE FROM questions WHERE id = $1 RETURNING *"
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Reorder questions
 */
export const reorderQuestions = async (assessmentId, questionOrders) => {
  try {
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      for (const { questionId, order } of questionOrders) {
        await client.query(
          "UPDATE questions SET question_order = $1, updated_at = NOW() WHERE id = $2 AND assessment_id = $3",
          [order, questionId, assessmentId],
        )
      }

      await client.query("COMMIT")

      // Return updated questions
      const result = await client.query(
        "SELECT * FROM questions WHERE assessment_id = $1 AND is_active = true ORDER BY question_order ASC",
        [assessmentId],
      )

      return result.rows.map((question) => {
        if (question.options && typeof question.options === "string") {
          try {
            question.options = JSON.parse(question.options)
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
        return question
      })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    throw error
  }
}

/**
 * Duplicate question
 */
export const duplicateQuestion = async (id) => {
  try {
    const originalQuery = "SELECT * FROM questions WHERE id = $1 AND is_active = true"
    const originalResult = await pool.query(originalQuery, [id])

    if (originalResult.rows.length === 0) {
      return null
    }

    const original = originalResult.rows[0]

    // Get the next order number
    const orderQuery =
      "SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM questions WHERE assessment_id = $1"
    const orderResult = await pool.query(orderQuery, [original.assessment_id])
    const nextOrder = orderResult.rows[0].next_order

    const duplicateQuery = `
      INSERT INTO questions (
        assessment_id, question_text, question_type, options, correct_answer, 
        explanation, marks, difficulty_level, tags, question_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `

    const values = [
      original.assessment_id,
      `${original.question_text} (Copy)`,
      original.question_type,
      original.options,
      original.correct_answer,
      original.explanation,
      original.marks,
      original.difficulty_level,
      original.tags,
      nextOrder,
    ]

    const result = await pool.query(duplicateQuery, values)
    const question = result.rows[0]

    // Parse JSON fields
    if (question.options && typeof question.options === "string") {
      try {
        question.options = JSON.parse(question.options)
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return question
  } catch (error) {
    throw error
  }
}

/**
 * Get question statistics
 */
export const getQuestionStats = async (assessmentId) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_questions,
        COUNT(CASE WHEN question_type = 'multiple_choice' THEN 1 END) as multiple_choice_count,
        COUNT(CASE WHEN question_type = 'true_false' THEN 1 END) as true_false_count,
        COUNT(CASE WHEN question_type = 'short_answer' THEN 1 END) as short_answer_count,
        COUNT(CASE WHEN question_type = 'essay' THEN 1 END) as essay_count,
        COUNT(CASE WHEN difficulty_level = 'easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN difficulty_level = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN difficulty_level = 'hard' THEN 1 END) as hard_count,
        SUM(marks) as total_marks,
        AVG(marks) as average_marks
      FROM questions 
      WHERE assessment_id = $1 AND is_active = true
    `

    const result = await pool.query(query, [assessmentId])
    return result.rows[0] || null
  } catch (error) {
    throw error
  }
}

/**
 * Search questions
 */
export const searchQuestions = async (assessmentId, searchTerm, filters = {}) => {
  try {
    let query = `
      SELECT * FROM questions 
      WHERE assessment_id = $1 AND is_active = true
    `
    const values = [assessmentId]
    let paramCount = 1

    if (searchTerm) {
      paramCount++
      query += ` AND (question_text ILIKE $${paramCount} OR explanation ILIKE $${paramCount})`
      values.push(`%${searchTerm}%`)
    }

    if (filters.question_type) {
      paramCount++
      query += ` AND question_type = $${paramCount}`
      values.push(filters.question_type)
    }

    if (filters.difficulty_level) {
      paramCount++
      query += ` AND difficulty_level = $${paramCount}`
      values.push(filters.difficulty_level)
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++
      query += ` AND tags && $${paramCount}`
      values.push(filters.tags)
    }

    query += ` ORDER BY question_order ASC, created_at ASC`

    const result = await pool.query(query, values)

    // Parse JSON fields for each question
    const questions = result.rows.map((question) => {
      if (question.options && typeof question.options === "string") {
        try {
          question.options = JSON.parse(question.options)
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
      return question
    })

    return questions
  } catch (error) {
    throw error
  }
}

/**
 * Bulk create questions
 */
export const bulkCreateQuestions = async (assessmentId, questionsData) => {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const createdQuestions = []

    for (let i = 0; i < questionsData.length; i++) {
      const questionData = { ...questionsData[i], assessment_id: assessmentId }

      const query = `
        INSERT INTO questions (
          assessment_id, question_text, question_type, options, correct_answer, 
          explanation, marks, difficulty_level, tags, question_order, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `

      const values = [
        questionData.assessment_id,
        questionData.question_text,
        questionData.question_type,
        typeof questionData.options === "object" ? JSON.stringify(questionData.options) : questionData.options,
        questionData.correct_answer,
        questionData.explanation,
        questionData.marks || 1,
        questionData.difficulty_level || "medium",
        questionData.tags || [],
        questionData.question_order || i + 1,
      ]

      const result = await client.query(query, values)
      const question = result.rows[0]

      // Parse JSON fields
      if (question.options && typeof question.options === "string") {
        try {
          question.options = JSON.parse(question.options)
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      createdQuestions.push(question)
    }

    await client.query("COMMIT")
    return createdQuestions
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
