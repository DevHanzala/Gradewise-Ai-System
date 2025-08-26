import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardHeader, CardContent } from "../../components/ui/Card"
import LoadingSpinner from "../../components/ui/LoadingSpinner"
import Modal from "../../components/ui/Modal"
import Navbar from "../../components/Navbar"
import Footer from "../../components/Footer"
import toast from "react-hot-toast"

function AddStudent() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      showModal("error", "Validation Error", "Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      showModal("error", "Validation Error", "Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:5000/api/auth/register-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: "student",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        showModal("success", "Success", "Student registered successfully!")
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        })
        setTimeout(() => {
          navigate("/instructor/dashboard")
        }, 2000)
      } else {
        showModal("error", "Registration Failed", data.message || "Failed to register student")
      }
    } catch (error) {
      console.error("Registration error:", error)
      showModal("error", "Error", "Failed to register student. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Student</h1>
          <p className="text-gray-600">Register a new student account</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Student Information</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter student's full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter student's email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/instructor/dashboard")}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Registering...</span>
                    </div>
                  ) : (
                    "Register Student"
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
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

export default AddStudent
