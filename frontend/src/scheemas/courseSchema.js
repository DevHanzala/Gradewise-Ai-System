import { z } from "zod" // Import Zod

// Zod schema for course creation/update form validation
export const courseSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters long"),
  description: z.string().min(10, "Course description must be at least 10 characters long"),
})

// Zod schema for student enrollment form validation
export const enrollmentSchema = z.object({
  studentEmail: z.string().email("Please enter a valid email address"),
})
