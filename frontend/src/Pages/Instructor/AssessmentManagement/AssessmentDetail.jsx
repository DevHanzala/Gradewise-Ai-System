import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useAssessmentStore from "../../../store/assessmentStore";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Modal from "../../../components/ui/Modal";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import toast from "react-hot-toast";

function AssessmentDetail() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { currentAssessment, loading, error, getAssessmentById, deleteAssessment } = useAssessmentStore();
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" });

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        await getAssessmentById(assessmentId);
      } catch (err) {
        // Error handling is done in assessmentStore.js, which sets error and shows toast
        if (err.response?.status === 404) {
          setModal({ isOpen: true, type: "error", title: "Not Found", message: "Assessment not found or you do not have access." });
        } else if (err.response?.status === 403) {
          setModal({ isOpen: true, type: "error", title: "Unauthorized", message: "Please log in to view this assessment." });
          setTimeout(() => navigate("/login"), 2000);
        } else {
          setModal({ isOpen: true, type: "error", title: "Error", message: err.message || "Failed to fetch assessment details." });
        }
      }
    };
    fetchAssessment();
  }, [assessmentId, getAssessmentById, navigate]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this assessment?")) {
      try {
        await deleteAssessment(assessmentId);
        toast.success("Assessment deleted successfully!");
        navigate("/instructor/assessments");
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || "Failed to delete assessment.";
        setModal({ isOpen: true, type: "error", title: "Error", message: errorMessage });
        toast.error(errorMessage);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading assessment details...</span>
      </div>
    );
  }

  if (error || !currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Assessment Not Found</h1>
          <p className="text-gray-600 mb-4">The assessment could not be found or you do not have access.</p>
          <Link to="/instructor/assessments" className="text-blue-600 hover:underline">
            Back to Assessments
          </Link>
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

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message });
    toast[type === "success" ? "success" : "error"](message);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{currentAssessment.title}</h1>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">AI Prompt</h2>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto">
              {currentAssessment.prompt || "No prompt available."}
            </pre>
          </CardContent>
        </Card>
        {/* External Links */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">External Links</h2>
          </CardHeader>
          <CardContent>
            {currentAssessment.external_links?.length > 0 ? (
              <ul className="space-y-2">
                {currentAssessment.external_links.map((link, index) => (
                  <li key={index}>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No external links added.</p>
            )}
          </CardContent>
        </Card>
        {/* Resources */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Resources</h2>
          </CardHeader>
          <CardContent>
            {currentAssessment.resources?.length > 0 ? (
              <ul className="space-y-2">
                {currentAssessment.resources.map((resource, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{resource.name} ({resource.type})</span>
                    {/* Assume download link if needed */}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No resources added.</p>
            )}
          </CardContent>
        </Card>
        {/* Question Blocks */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Question Blocks</h2>
          </CardHeader>
          <CardContent>
            {currentAssessment.question_blocks?.length > 0 ? (
              currentAssessment.question_blocks.map((block, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
                  <h3 className="text-lg font-medium">{block.question_type.toUpperCase()}</h3>
                  <p>Count: {block.question_count}</p>
                </div>
              ))
            ) : (
              <p>No question blocks defined.</p>
            )}
          </CardContent>
        </Card>
        {/* Actions */}
        <div className="mt-8 flex space-x-4">
          {!currentAssessment.is_executed ? (
            <Link to={`/instructor/assessments/${assessmentId}/edit`} className="px-4 py-2 bg-blue-600 text-white rounded-md">
              Edit
            </Link>
          ) : (
            <p className="text-red-600">Cannot edit: Assessment has been executed.</p>
          )}
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">
            Delete
          </button>
        </div>
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

export default AssessmentDetail;