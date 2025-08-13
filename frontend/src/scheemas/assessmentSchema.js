// frontend/src/schemas/assessmentSchema.js
import { z } from "zod"

// Question block schema
export const questionBlockSchema = z.object({
  type: z.enum(["mcq", "short_answer", "true_false", "matching"], {
    required_error: "Question type is required",
  }),
  questionCount: z
    .number()
    .min(1, "At least 1 question is required")
    .max(50, "Maximum 50 questions allowed")
    .default(5),
  durationPerQuestion: z
    .number()
    .min(10, "Minimum 10 seconds per question")
    .max(600, "Maximum 10 minutes per question")
    .default(60),
  positiveMarks: z
    .number()
    .min(0.1, "Positive marks must be at least 0.1")
    .max(10, "Maximum 10 marks per question")
    .default(1.0),
  negativeMarks: z
    .number()
    .min(0, "Negative marks cannot be negative")
    .max(5, "Maximum 5 negative marks")
    .default(0.0),
  mcqOptions: z
    .number()
    .min(2, "At least 2 options required for MCQ")
    .max(6, "Maximum 6 options allowed")
    .default(4)
    .optional(),
  matchingLeftOptions: z
    .number()
    .min(2, "At least 2 left options required")
    .max(10, "Maximum 10 left options")
    .default(3)
    .optional(),
  matchingRightOptions: z
    .number()
    .min(2, "At least 2 right options required")
    .max(10, "Maximum 10 right options")
    .default(4)
    .optional(),
})

// Assessment creation schema
export const createAssessmentSchema = z.object({
  name: z
    .string()
    .min(3, "Assessment name must be at least 3 characters")
    .max(255, "Assessment name must be less than 255 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  aiInstructions: z
    .string()
    .min(20, "AI instructions must be at least 20 characters")
    .max(2000, "AI instructions must be less than 2000 characters")
    .optional(),
  timeLimit: z
    .number()
    .min(5, "Minimum 5 minutes")
    .max(300, "Maximum 5 hours (300 minutes)")
    .default(60),
  language: z
    .enum(["en", "ur", "ar", "fa"], {
      required_error: "Language is required",
    })
    .default("en"),
  questionBlocks: z
    .array(questionBlockSchema)
    .min(1, "At least one question block is required")
    .max(10, "Maximum 10 question blocks allowed"),
})

// Assessment update schema (all fields optional)
export const updateAssessmentSchema = z.object({
  name: z
    .string()
    .min(3, "Assessment name must be at least 3 characters")
    .max(255, "Assessment name must be less than 255 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  aiInstructions: z
    .string()
    .min(20, "AI instructions must be at least 20 characters")
    .max(2000, "AI instructions must be less than 2000 characters")
    .optional(),
  timeLimit: z
    .number()
    .min(5, "Minimum 5 minutes")
    .max(300, "Maximum 5 hours (300 minutes)")
    .optional(),
  language: z
    .enum(["en", "ur", "ar", "fa"])
    .optional(),
  isActive: z.boolean().optional(),
})

// Student enrollment schema
export const enrollStudentSchema = z.object({
  studentEmail: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Student email is required"),
})

// Resource schema
export const resourceSchema = z.object({
  name: z
    .string()
    .min(3, "Resource name must be at least 3 characters")
    .max(255, "Resource name must be less than 255 characters"),
  url: z
    .string()
    .url("Please enter a valid URL")
    .optional(),
  visibility: z
    .enum(["private", "public"])
    .default("private"),
})

// Language options for the frontend
export const languageOptions = [
  { value: "en", label: "English", direction: "ltr" },
  { value: "ur", label: "اردو (Urdu)", direction: "rtl" },
  { value: "ar", label: "العربية (Arabic)", direction: "rtl" },
  { value: "fa", label: "فارسی (Persian)", direction: "rtl" },
]

// Question type options
export const questionTypeOptions = [
  {
    value: "mcq",
    label: "Multiple Choice Questions (MCQ)",
    description: "Questions with multiple options where students select one correct answer",
    icon: "📝",
  },
  {
    value: "short_answer",
    label: "Short Answer Questions",
    description: "Questions requiring brief written responses from students",
    icon: "✍️",
  },
  {
    value: "true_false",
    label: "True/False Questions",
    description: "Questions with only two options: True or False",
    icon: "✅",
  },
  {
    value: "matching",
    label: "Matching Questions",
    description: "Questions where students match items from two lists",
    icon: "🔗",
  },
]

// Default question block configurations
export const defaultQuestionBlocks = {
  mcq: {
    type: "mcq",
    questionCount: 5,
    durationPerQuestion: 60,
    positiveMarks: 1.0,
    negativeMarks: 0.25,
    mcqOptions: 4,
  },
  short_answer: {
    type: "short_answer",
    questionCount: 3,
    durationPerQuestion: 120,
    positiveMarks: 2.0,
    negativeMarks: 0.0,
  },
  true_false: {
    type: "true_false",
    questionCount: 10,
    durationPerQuestion: 30,
    positiveMarks: 0.5,
    negativeMarks: 0.25,
  },
  matching: {
    type: "matching",
    questionCount: 2,
    durationPerQuestion: 180,
    positiveMarks: 3.0,
    negativeMarks: 0.0,
    matchingLeftOptions: 4,
    matchingRightOptions: 4,
  },
}
