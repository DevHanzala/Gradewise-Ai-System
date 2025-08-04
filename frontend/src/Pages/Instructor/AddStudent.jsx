import { useState } from "react"
import { Link } from "react-router-dom"
import { z } from "zod"
import useAuthStore from "../../store/authStore.js"
import { Card, CardHeader, CardContent } from "../../components/ui/Card.jsx"
import LoadingSpinner from "../../components/ui/LoadingSpinner.jsx"
import Modal from "../../components/ui/Modal.jsx"

const addStudentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
})

function AddStudent() {
  const registerStudent = useAuthStore((state) => state.registerStudent)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: undefined }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      addStudentSchema.parse(formData)
      setErrors({})

      const studentData = { ...formData, role: "student" }
      const response = await registerStudent(studentData)

      showModal(
        "success",
        "Student Registered",
        response.message || "Student registered successfully! They will receive a verification email.",
      )

      setFormData({
        name: "",
        email: "",
        password: "",
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {}
        for (const issue of error.issues) {
          newErrors[issue.path[0]] = issue.message
        }
        setErrors(newErrors)
      } else if (error.response) {
        showModal("error", "Registration Failed", error.response.data.message || "Failed to register student.")
      } else {
        showModal("error", "Connection Error", "An unexpected error occurred. Please check your network connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
            </div>
            <Link
              to="/instructor/dashboard"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition duration-200"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="text-center">
              <div className="text-4xl mb-4">👨‍🎓</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Register New Student</h2>
              <p className="text-gray-600">Add a new student to your class</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Student Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Enter student's full name"
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="student@example.com"
                  required
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                    errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                  placeholder="Enter temporary password"
                  required
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                <p className="text-gray-500 text-sm mt-2">
                  💡 The student will need to verify their email before they can log in.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Student account will be created</li>
                  <li>• Verification email will be sent automatically</li>
                  <li>• Student must verify email before first login</li>
                  <li>• They can then log in with the provided password</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Registering Student...</span>
                  </>
                ) : (
                  "Register Student"
                )}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

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

export default AddStudent
