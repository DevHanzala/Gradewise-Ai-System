import { useState } from "react"
import { useNavigate } from "react-router-dom"
import useAssessmentStore from "../../../store/assessmentStore.js"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"

function CreateAssessment() {
  const navigate = useNavigate()
  const { createAssessment, loading } = useAssessmentStore()
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    total_marks: 100,
    passing_marks: 40,
    instructions: "",
    is_published: false,
    start_date: "",
    end_date: "",
    // Removed course_id - not needed for this assessment system
  })

  const [questionBlocks, setQuestionBlocks] = useState([
    {
      block_title: "",
      block_description: "",
      question_count: 1,
      marks_per_question: 1,
      difficulty_level: "medium",
      question_type: "multiple_choice",
      topics: [],
    },
  ])

  const [newTopic, setNewTopic] = useState("")

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleBlockChange = (index, field, value) => {
    setQuestionBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, [field]: value } : block)))
  }

  const addQuestionBlock = () => {
    setQuestionBlocks((prev) => [
      ...prev,
      {
        block_title: "",
        block_description: "",
        question_count: 1,
        marks_per_question: 1,
        difficulty_level: "medium",
        question_type: "multiple_choice",
        topics: [],
      },
    ])
  }

  const removeQuestionBlock = (index) => {
    if (questionBlocks.length > 1) {
      setQuestionBlocks((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const addTopicToBlock = (blockIndex) => {
    if (newTopic.trim()) {
      setQuestionBlocks((prev) =>
        prev.map((block, i) => (i === blockIndex ? { ...block, topics: [...block.topics, newTopic.trim()] } : block)),
      )
      setNewTopic("")
    }
  }

  const removeTopicFromBlock = (blockIndex, topicIndex) => {
    setQuestionBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex ? { ...block, topics: block.topics.filter((_, ti) => ti !== topicIndex) } : block,
      ),
    )
  }

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      showModal("error", "Validation Error", "Assessment title is required.")
      return
    }

    if (!formData.description.trim()) {
      showModal("error", "Validation Error", "Assessment description is required.")
      return
    }

    if (questionBlocks.some((block) => !block.block_title.trim())) {
      showModal("error", "Validation Error", "All question blocks must have a title.")
      return
    }

    try {
      const assessmentData = {
        ...formData,
        question_blocks: questionBlocks,
      }

      console.log("📝 Submitting assessment data:", assessmentData)
      console.log("🔑 User token exists:", !!localStorage.getItem("token"))

      const newAssessment = await createAssessment(assessmentData)

      if (newAssessment) {
        console.log("✅ Assessment created successfully:", newAssessment)
        showModal("success", "Success", "Assessment created successfully! Redirecting to assessment detail...")

        // Navigate to assessment detail page after a short delay
        setTimeout(() => {
          navigate(`/instructor/assessments/${newAssessment.id}`)
        }, 2000)
      }
    } catch (error) {
      console.error("❌ Failed to create assessment:", error)
      const errorMessage = error.message || "Failed to create assessment. Please try again."
      showModal("error", "Error", errorMessage)
      
      // Log additional error details
      if (error.response) {
        console.error("📡 Response data:", error.response.data)
        console.error("📡 Response status:", error.response.status)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Assessment</h1>
          <p className="text-gray-600">Set up a new assessment for your students.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter assessment title"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="total_marks" className="block text-sm font-medium text-gray-700 mb-2">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    id="total_marks"
                    name="total_marks"
                    value={formData.total_marks}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what this assessment covers"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="passing_marks" className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    id="passing_marks"
                    name="passing_marks"
                    value={formData.passing_marks}
                    onChange={handleInputChange}
                    min="1"
                    max={formData.total_marks}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    id="instructions"
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Special instructions for students"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700">
                  Publish immediately (students can see and take this assessment)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Question Blocks */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Question Blocks</h2>
                <button
                  type="button"
                  onClick={addQuestionBlock}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                >
                  Add Block
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {questionBlocks.map((block, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Block {index + 1}</h3>
                    {questionBlocks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestionBlock(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove Block
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Block Title *</label>
                      <input
                        type="text"
                        value={block.block_title}
                        onChange={(e) => handleBlockChange(index, "block_title", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Variables and Data Types"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                      <select
                        value={block.question_type}
                        onChange={(e) => handleBlockChange(index, "question_type", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="coding">Coding</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="essay">Essay</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Block Description</label>
                    <textarea
                      value={block.block_description}
                      onChange={(e) => handleBlockChange(index, "block_description", e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe what this block covers"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question Count</label>
                      <input
                        type="number"
                        value={block.question_count}
                        onChange={(e) => handleBlockChange(index, "question_count", Number.parseInt(e.target.value))}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marks per Question</label>
                      <input
                        type="number"
                        value={block.marks_per_question}
                        onChange={(e) =>
                          handleBlockChange(index, "marks_per_question", Number.parseInt(e.target.value))
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                      <select
                        value={block.difficulty_level}
                        onChange={(e) => handleBlockChange(index, "difficulty_level", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Topics */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {block.topics.map((topic, topicIndex) => (
                        <span
                          key={topicIndex}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {topic}
                          <button
                            type="button"
                            onClick={() => removeTopicFromBlock(index, topicIndex)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a topic"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTopicToBlock(index)
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addTopicToBlock(index)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate("/instructor/assessments")}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 flex items-center"
            >
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              Create Assessment
            </button>
          </div>
        </form>
      </div>

      <Footer />

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
      >
        {modal.message}
      </Modal>
    </div>
  )
}

export default CreateAssessment
