import pool from "../DB/db.js" // Import the database pool

/**
 * Creates the 'courses' table if it does not already exist.
 * This table stores course information including title, description, instructor, and creation timestamp.
 */
export const createCourseTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `
  try {
    await pool.query(query)
    console.log("Courses table checked/created successfully.")
  } catch (err) {
    console.error("Error creating courses table:", err.message)
  }
}

/**
 * Creates the 'students_courses' join table if it does not already exist.
 * This table manages the many-to-many relationship between students and courses.
 */
export const createStudentsCoursesTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS students_courses (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, course_id) -- Prevent duplicate enrollments
    );
  `
  try {
    await pool.query(query)
    console.log("Students_courses table checked/created successfully.")
  } catch (err) {
    console.error("Error creating students_courses table:", err.message)
  }
}

/**
 * Creates the 'assignments' table if it does not already exist.
 * This table stores assignment information for courses.
 */
export const createAssignmentsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      due_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `
  try {
    await pool.query(query)
    console.log("Assignments table checked/created successfully.")
  } catch (err) {
    console.error("Error creating assignments table:", err.message)
  }
}

/**
 * Creates the 'submissions' table if it does not already exist.
 * This table stores student submissions for assignments.
 */
export const createSubmissionsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      submission_file_url VARCHAR(500),
      grade VARCHAR(10),
      feedback TEXT,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, assignment_id) -- One submission per student per assignment
    );
  `
  try {
    await pool.query(query)
    console.log("Submissions table checked/created successfully.")
  } catch (err) {
    console.error("Error creating submissions table:", err.message)
  }
}

/**
 * Creates a new course in the database.
 * @param {string} title - The title of the course.
 * @param {string} description - The description of the course.
 * @param {number} instructorId - The ID of the instructor creating the course.
 * @returns {Promise<Object>} The newly created course object.
 */
export const createCourse = async (title, description, instructorId) => {
  const query = `
    INSERT INTO courses (title, description, instructor_id) 
    VALUES ($1, $2, $3) 
    RETURNING id, title, description, instructor_id, created_at
  `
  const { rows } = await pool.query(query, [title, description, instructorId])
  return rows[0]
}

/**
 * Finds courses by instructor ID.
 * @param {number} instructorId - The ID of the instructor.
 * @returns {Promise<Array>} Array of courses belonging to the instructor.
 */
export const findCoursesByInstructor = async (instructorId) => {
  const query = `
    SELECT c.*, u.name as instructor_name 
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE c.instructor_id = $1 
    ORDER BY c.created_at DESC
  `
  const { rows } = await pool.query(query, [instructorId])
  return rows
}

/**
 * Finds a course by ID with instructor information.
 * @param {number} courseId - The ID of the course.
 * @returns {Promise<Object|undefined>} The course object if found.
 */
export const findCourseById = async (courseId) => {
  const query = `
    SELECT c.*, u.name as instructor_name 
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE c.id = $1
  `
  const { rows } = await pool.query(query, [courseId])
  return rows[0]
}

/**
 * Updates a course in the database.
 * @param {number} courseId - The ID of the course to update.
 * @param {string} title - The new title of the course.
 * @param {string} description - The new description of the course.
 * @returns {Promise<Object|undefined>} The updated course object.
 */
export const updateCourse = async (courseId, title, description) => {
  const query = `
    UPDATE courses 
    SET title = $1, description = $2 
    WHERE id = $3 
    RETURNING id, title, description, instructor_id, created_at
  `
  const { rows } = await pool.query(query, [title, description, courseId])
  return rows[0]
}

/**
 * Deletes a course from the database.
 * @param {number} courseId - The ID of the course to delete.
 * @returns {Promise<Object|undefined>} The deleted course object.
 */
export const deleteCourse = async (courseId) => {
  const query = `
    DELETE FROM courses 
    WHERE id = $1 
    RETURNING id, title, description, instructor_id, created_at
  `
  const { rows } = await pool.query(query, [courseId])
  return rows[0]
}

/**
 * Enrolls a student in a course.
 * @param {number} studentId - The ID of the student.
 * @param {number} courseId - The ID of the course.
 * @returns {Promise<Object>} The enrollment record.
 */
export const enrollStudent = async (studentId, courseId) => {
  const query = `
    INSERT INTO students_courses (student_id, course_id) 
    VALUES ($1, $2) 
    RETURNING id, student_id, course_id, enrolled_at
  `
  const { rows } = await pool.query(query, [studentId, courseId])
  return rows[0]
}

/**
 * Gets enrolled students for a course.
 * @param {number} courseId - The ID of the course.
 * @returns {Promise<Array>} Array of enrolled students.
 */
export const getEnrolledStudents = async (courseId) => {
  const query = `
    SELECT u.id, u.name, u.email, sc.enrolled_at
    FROM students_courses sc
    JOIN users u ON sc.student_id = u.id
    WHERE sc.course_id = $1
    ORDER BY sc.enrolled_at DESC
  `
  const { rows } = await pool.query(query, [courseId])
  return rows
}

/**
 * Gets courses a student is enrolled in.
 * @param {number} studentId - The ID of the student.
 * @returns {Promise<Array>} Array of courses the student is enrolled in.
 */
export const getStudentCourses = async (studentId) => {
  const query = `
    SELECT c.*, u.name as instructor_name, sc.enrolled_at
    FROM students_courses sc
    JOIN courses c ON sc.course_id = c.id
    JOIN users u ON c.instructor_id = u.id
    WHERE sc.student_id = $1
    ORDER BY sc.enrolled_at DESC
  `
  const { rows } = await pool.query(query, [studentId])
  return rows
}

/**
 * Gets all courses (admin only).
 * @returns {Promise<Array>} Array of all courses.
 */
export const getAllCourses = async () => {
  const query = `
    SELECT c.*, u.name as instructor_name,
           (SELECT COUNT(*) FROM students_courses WHERE course_id = c.id) as enrolled_count
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    ORDER BY c.created_at DESC
  `
  const { rows } = await pool.query(query)
  return rows
}

/**
 * Removes a student from a course.
 * @param {number} studentId - The ID of the student.
 * @param {number} courseId - The ID of the course.
 * @returns {Promise<Object|undefined>} The removed enrollment record.
 */
export const unenrollStudent = async (studentId, courseId) => {
  const query = `
    DELETE FROM students_courses 
    WHERE student_id = $1 AND course_id = $2 
    RETURNING id, student_id, course_id, enrolled_at
  `
  const { rows } = await pool.query(query, [studentId, courseId])
  return rows[0]
}

/**
 * Checks if a student is enrolled in a course.
 * @param {number} studentId - The ID of the student.
 * @param {number} courseId - The ID of the course.
 * @returns {Promise<boolean>} True if enrolled, false otherwise.
 */
export const isStudentEnrolled = async (studentId, courseId) => {
  const query = `
    SELECT id FROM students_courses 
    WHERE student_id = $1 AND course_id = $2
  `
  const { rows } = await pool.query(query, [studentId, courseId])
  return rows.length > 0
}
