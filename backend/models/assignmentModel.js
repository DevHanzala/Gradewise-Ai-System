import pool from "../DB/db.js" // Import the database pool

/**
 * Creates a new assignment in the database.
 * @param {string} title - The title of the assignment.
 * @param {string} description - The description of the assignment.
 * @param {number} courseId - The ID of the course this assignment belongs to.
 * @param {number} createdBy - The ID of the user creating the assignment.
 * @param {Date} dueDate - The due date for the assignment.
 * @returns {Promise<Object>} The newly created assignment object.
 */
export const createAssignment = async (title, description, courseId, createdBy, dueDate) => {
  const query = `
    INSERT INTO assignments (title, description, course_id, created_by, due_date) 
    VALUES ($1, $2, $3, $4, $5) 
    RETURNING id, title, description, course_id, created_by, due_date, created_at
  `
  const { rows } = await pool.query(query, [title, description, courseId, createdBy, dueDate])
  return rows[0]
}

/**
 * Finds assignments by course ID.
 * @param {number} courseId - The ID of the course.
 * @returns {Promise<Array>} Array of assignments for the course.
 */
export const findAssignmentsByCourse = async (courseId) => {
  const query = `
    SELECT a.*, u.name as created_by_name, c.title as course_title
    FROM assignments a
    JOIN users u ON a.created_by = u.id
    JOIN courses c ON a.course_id = c.id
    WHERE a.course_id = $1 
    ORDER BY a.due_date ASC, a.created_at DESC
  `
  const { rows } = await pool.query(query, [courseId])
  return rows
}

/**
 * Finds an assignment by ID with related information.
 * @param {number} assignmentId - The ID of the assignment.
 * @returns {Promise<Object|undefined>} The assignment object if found.
 */
export const findAssignmentById = async (assignmentId) => {
  const query = `
    SELECT a.*, u.name as created_by_name, c.title as course_title, c.instructor_id
    FROM assignments a
    JOIN users u ON a.created_by = u.id
    JOIN courses c ON a.course_id = c.id
    WHERE a.id = $1
  `
  const { rows } = await pool.query(query, [assignmentId])
  return rows[0]
}

/**
 * Updates an assignment in the database.
 * @param {number} assignmentId - The ID of the assignment to update.
 * @param {string} title - The new title of the assignment.
 * @param {string} description - The new description of the assignment.
 * @param {Date} dueDate - The new due date for the assignment.
 * @returns {Promise<Object|undefined>} The updated assignment object.
 */
export const updateAssignment = async (assignmentId, title, description, dueDate) => {
  const query = `
    UPDATE assignments 
    SET title = $1, description = $2, due_date = $3 
    WHERE id = $4 
    RETURNING id, title, description, course_id, created_by, due_date, created_at
  `
  const { rows } = await pool.query(query, [title, description, dueDate, assignmentId])
  return rows[0]
}

/**
 * Deletes an assignment from the database.
 * @param {number} assignmentId - The ID of the assignment to delete.
 * @returns {Promise<Object|undefined>} The deleted assignment object.
 */
export const deleteAssignment = async (assignmentId) => {
  const query = `
    DELETE FROM assignments 
    WHERE id = $1 
    RETURNING id, title, description, course_id, created_by, due_date, created_at
  `
  const { rows } = await pool.query(query, [assignmentId])
  return rows[0]
}

/**
 * Gets assignments for a student based on their enrolled courses.
 * @param {number} studentId - The ID of the student.
 * @returns {Promise<Array>} Array of assignments for the student's enrolled courses.
 */
export const getStudentAssignments = async (studentId) => {
  const query = `
    SELECT a.*, c.title as course_title, u.name as created_by_name,
           s.id as submission_id, s.grade, s.feedback, s.submitted_at
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN users u ON a.created_by = u.id
    JOIN students_courses sc ON c.id = sc.course_id
    LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = $1
    WHERE sc.student_id = $1
    ORDER BY a.due_date ASC, a.created_at DESC
  `
  const { rows } = await pool.query(query, [studentId])
  return rows
}

/**
 * Gets all assignments (admin only).
 * @returns {Promise<Array>} Array of all assignments.
 */
export const getAllAssignments = async () => {
  const query = `
    SELECT a.*, c.title as course_title, u.name as created_by_name,
           (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN users u ON a.created_by = u.id
    ORDER BY a.created_at DESC
  `
  const { rows } = await pool.query(query)
  return rows
}

/**
 * Gets assignments created by a specific instructor.
 * @param {number} instructorId - The ID of the instructor.
 * @returns {Promise<Array>} Array of assignments created by the instructor.
 */
export const getInstructorAssignments = async (instructorId) => {
  const query = `
    SELECT a.*, c.title as course_title,
           (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE a.created_by = $1
    ORDER BY a.due_date ASC, a.created_at DESC
  `
  const { rows } = await pool.query(query, [instructorId])
  return rows
}
