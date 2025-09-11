import { useState, useEffect } from "react";
import useResourceStore from "../../../store/resourceStore.js";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Modal from "../../../components/ui/Modal";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import toast from "react-hot-toast";

function ResourceManagement() {
  const navigate = useNavigate();
  const { resources, loading, fetchResources, uploadResources, deleteResource } = useResourceStore();
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" });

  // Load resources on mount (global)
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Handle resource upload (global, backend chunks new PDFs)
  const handleResourceUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      toast.error("No files selected.");
      return;
    }
    try {
      await uploadResources(files); // Removed assessmentId, now global
      toast.success(`${files.length} resource(s) uploaded and chunked successfully.`);
      fetchResources();
    } catch (error) {
      toast.error(error.message || "Failed to upload resources.");
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resourceId) => {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      try {
        await deleteResource(resourceId); // Removed assessmentId
        toast.success("Resource deleted successfully.");
        fetchResources();
      } catch (error) {
        toast.error(error.message || "Failed to delete resource.");
      }
    }
  };

  // Modal display
  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Resources</h1>
          <button
            onClick={() => navigate("/instructor/assessments")}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Back to Assessments
          </button>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Upload New Resources</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.txt,.doc,.docx"
                onChange={handleResourceUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500">Accepted formats: PDF, PPT, TXT, DOC (Max: 10MB each). New PDFs will be chunked for efficient storage.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Existing Resources ({resources.length})</h2>
          </CardHeader>
          <CardContent>
            {resources.length === 0 ? (
              <p className="text-gray-600">No resources available. Upload some to reuse in assessments.</p>
            ) : (
              <div className="space-y-4">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-md">
                    <div>
                      <p className="font-medium">{resource.name}</p>
                      <p className="text-sm text-gray-500">{resource.type} • {resource.size} MB</p>
                    </div>
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
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
  );
}

export default ResourceManagement;