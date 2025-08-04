import { z } from "zod" // Import Zod

// Zod schema for assignment creation/update form validation
export const assignmentSchema = z.object({
  title: z.string().min(3, "Assignment title must be at least 3 characters long"),
  description: z.string().min(10, "Assignment description must be at least 10 characters long"),
  courseId: z.number().min(1, "Please select a course"),
  dueDate: z.string().optional(), // Optional due date
})

// Zod schema for assignment submission form validation
export const submissionSchema = z.object({
  assignmentId: z.number().min(1, "Assignment ID is required"),
  submissionFileUrl: z.string().url("Please provide a valid file URL").optional(),
})

// Zod schema for grading form validation
export const gradingSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  feedback: z.string().optional(), // Optional feedback
})
