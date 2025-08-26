import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardHeader, CardContent } from "../../../components/ui/Card"
import LoadingSpinner from "../../../components/ui/LoadingSpinner"
import Modal from "../../../components/ui/Modal"
import Navbar from "../../../components/Navbar"
import Footer from "../../../components/Footer"
import toast from "react-hot-toast"
import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

/**
 * Resource Management Interface
 * Allows instructors to manage assessment resources:
 * - Upload files (PDFs, images, documents)
 * - Add external links
 * - Organize materials by topic
 * - Share resources with students
 */
function ResourceManagement() {
  const { assessmentId } = useParams()
  const navigate = useNavigate()
  
  // State management
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [resources, setResources] = useState([])
  const [assessmentDetails, setAssessmentDetails] = useState(null)
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "general",
    file: null
  })
  
  // Link form state
  const [linkForm, setLinkForm] = useState({
    title: "",
    description: "",
    url: "",
    category: "general"
  })

  // Resource categories
  const categories = [
    { value: "general", label: "General", color: "bg-gray-100 text-gray-800" },
    { value: "reading", label: "Reading Material", color: "bg-blue-100 text-blue-800" },
    { value: "video", label: "Video Content", color: "bg-red-100 text-red-800" },
    { value: "practice", label: "Practice Exercises", color: "bg-green-100 text-green-800" },
    { value: "reference", label: "Reference", color: "bg-purple-100 text-purple-800" }
  ]

  useEffect(() => {
    loadAssessmentDetails()
    loadResources()
  }, [assessmentId])

  const loadAssessmentDetails = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setAssessmentDetails(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load assessment details:", error)
    }
  }

  const loadResources = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      
      const response = await axios.get(`${API_URL}/resources/assessment/${assessmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.success) {
        setResources(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load resources:", error)
      // Don't show error as this endpoint might not exist yet
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    
    if (!uploadForm.title || !uploadForm.file) {
      toast.error("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      
      formData.append("title", uploadForm.title)
      formData.append("description", uploadForm.description)
      formData.append("category", uploadForm.category)
      formData.append("file", uploadForm.file)
      formData.append("assessment_id", assessmentId)

      const response = await axios.post(`${API_URL}/resources/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      })

      if (response.data.success) {
        toast.success("Resource uploaded successfully!")
        setShowUploadModal(false)
        setUploadForm({ title: "", description: "", category: "general", file: null })
        loadResources()
      } else {
        throw new Error(response.data.message || "Failed to upload resource")
      }

    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error.response?.data?.message || "Failed to upload resource")
    } finally {
      setUploading(false)
    }
  }

  const handleAddLink = async (e) => {
    e.preventDefault()
    
    if (!linkForm.title || !linkForm.url) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const token = localStorage.getItem("token")
      
      const response = await axios.post(`${API_URL}/resources/link`, {
        title: linkForm.title,
        description: linkForm.description,
        url: linkForm.url,
        category: linkForm.category,
        assessment_id: assessmentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        toast.success("Link added successfully!")
        setShowLinkModal(false)
        setLinkForm({ title: "", description: "", url: "", category: "general" })
        loadResources()
      } else {
        throw new Error(response.data.message || "Failed to add link")
      }

    } catch (error) {
      console.error("Add link error:", error)
      toast.error(error.response?.data?.message || "Failed to add link")
    }
  }

  const handleDeleteResource = async (resourceId) => {
    if (!confirm("Are you sure you want to delete this resource?")) return

    try {
      const token = localStorage.getItem("token")
      
      const response = await axios.delete(`${API_URL}/resources/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        toast.success("Resource deleted successfully!")
        loadResources()
      } else {
        throw new Error(response.data.message || "Failed to delete resource")
      }

    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error.response?.data?.message || "Failed to delete resource")
    }
  }

  const getCategoryLabel = (category) => {
    return categories.find(c => c.value === category)?.label || "General"
  }

  const getCategoryColor = (category) => {
    return categories.find(c => c.value === category)?.color || "bg-gray-100 text-gray-800"
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
              <p className="text-gray-600 mt-2">
                Manage learning resources for: 
                <span className="font-semibold text-blue-600 ml-2">
                  {assessmentDetails?.title || "Loading..."}
                </span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Add Link
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
              >
                Upload Resource
              </button>
            </div>
          </div>
        </div>

        {/* Resource Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-blue-600">
                {resources.length}
              </div>
              <div className="text-sm text-gray-600">Total Resources</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-green-600">
                {resources.filter(r => r.type === "file").length}
              </div>
              <div className="text-sm text-gray-600">Files</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-purple-600">
                {resources.filter(r => r.type === "link").length}
              </div>
              <div className="text-sm text-gray-600">Links</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-yellow-600">
                {categories.length}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </CardContent>
          </Card>
        </div>

        {/* Resources List */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Assessment Resources</h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Resources Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start by uploading files or adding external links to help your students.
                </p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Upload First Resource
                  </button>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add First Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {resources.map((resource) => (
                  <div key={resource.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(resource.category)}`}>
                            {getCategoryLabel(resource.category)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {resource.type === "file" ? "File" : "Link"}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {resource.title}
                        </h3>
                        
                        {resource.description && (
                          <p className="text-gray-600 mb-3">{resource.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Added: {formatDate(resource.created_at)}</span>
                          {resource.type === "file" && resource.file_size && (
                            <span>Size: {formatFileSize(resource.file_size)}</span>
                          )}
                          {resource.type === "link" && (
                            <span>URL: {resource.url}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {resource.type === "file" && (
                          <a
                            href={resource.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Download
                          </a>
                        )}
                        {resource.type === "link" && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            Visit
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />

      {/* File Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        type="info"
        title="Upload Resource File"
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Title *
            </label>
            <input
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Study Guide, Practice Questions"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the resource..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File *
            </label>
            <input
              type="file"
              onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max: 10MB)
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? <LoadingSpinner size="sm" /> : "Upload Resource"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        type="info"
        title="Add External Link"
      >
        <form onSubmit={handleAddLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Title *
            </label>
            <input
              type="text"
              value={linkForm.title}
              onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Video Tutorial, Reference Article"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={linkForm.description}
              onChange={(e) => setLinkForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the link..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL *
            </label>
            <input
              type="url"
              value={linkForm.url}
              onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://example.com/resource"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={linkForm.category}
              onChange={(e) => setLinkForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ResourceManagement
