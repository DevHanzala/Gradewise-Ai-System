import { useState } from "react"
import { Link } from "react-router-dom"
import { z } from "zod"
import useAuthStore from "../store/authStore.js"
import { Card, CardContent } from "../components/ui/Card.jsx"
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx"
import Modal from "../components/ui/Modal.jsx"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

function ForgotPassword() {
  const forgotPassword = useAuthStore((state) => state.forgotPassword)

  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  const handleChange = (e) => {
    setEmail(e.target.value)
    if (errors.email) {
      setErrors({})
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      forgotPasswordSchema.parse({ email })
      setErrors({})

      const response = await forgotPassword({ email })
      showModal("success", "Reset Link Sent", response.message)
      setEmail("")
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {}
        for (const issue of error.issues) {
          newErrors[issue.path[0]] = issue.message
        }
        setErrors(newErrors)
      } else if (error.response) {
        showModal("error", "Request Failed", error.response.data.message || "Failed to send reset email.")
      } else {
        showModal("error", "Connection Error", "An unexpected error occurred. Please check your network connection.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent>
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h2>
            <p className="text-gray-600">Enter your email to receive a reset link</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                }`}
                placeholder="your@example.com"
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Sending Reset Link...</span>
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              ← Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>

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

export default ForgotPassword
