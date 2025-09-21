import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useAssessmentStore from "../../../store/assessmentStore.js";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Modal from "../../../components/ui/Modal";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import toast from "react-hot-toast";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function AssessmentDetail() {
  const { id } = useParams(); // Extract assessmentId from URL
  const navigate = useNavigate();
  const { currentAssessment, getAssessmentById, loading, error } = useAssessmentStore();
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log(`🔍 AssessmentDetail: id from useParams = "${id}"`); // Debug log
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Validate assessmentId
        if (!id || isNaN(parseInt(id))) {
          console.warn(`⚠️ Invalid assessment ID: "${id}"`);
          setModal({
            isOpen: true,
            type: "error",
            title: "Invalid Assessment",
            message: "The assessment ID is invalid. Redirecting to assessments list.",
          });
          toast.error("Invalid assessment ID");
          navigate("/instructor/assessments");
          return;
        }
        await getAssessmentById(parseInt(id));
      } catch (error) {
        console.error("❌ Error fetching assessment:", error);
        const errorMessage = error.response?.data?.message || error.message || "Failed to fetch assessment. Please try again.";
        setModal({ isOpen: true, type: "error", title: "Error", message: errorMessage });
        toast.error(errorMessage);
        if (error.response?.status === 404 || error.message === "Invalid assessment ID") {
          navigate("/instructor/assessments");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, getAssessmentById, navigate]);

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message });
    toast[type === "success" ? "success" : "error"](message);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Details</h1>
          <p className="text-gray-600">View and manage assessment details.</p>
        </div>

        {isLoading || loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading assessment...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assessment</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              to="/instructor/assessments"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
            >
              Back to Assessments
            </Link>
          </div>
        ) : !currentAssessment ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Not Found</h3>
            <p className="text-gray-600 mb-4">The requested assessment does not exist.</p>
            <Link
              to="/instructor/assessments"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
            >
              Back to Assessments
            </Link>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">{currentAssessment.title}</h2>
                <div className="flex items-center space-x-4">
                  {!currentAssessment.is_executed && (
                    <Link
                      to={`/instructor/assessments/${id}/edit`}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      Edit
                    </Link>
                  )}
                  <Link
                    to={`/instructor/assessments/${id}/enroll`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Manage Students
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("token");
                        const res = await axios.get(`${API_URL}/taking/assessments/${id}/print`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.data?.success) throw new Error(res.data?.message || "Failed to fetch print data");

                        // Build printable HTML
                        const questions = res.data.data.questions || [];
                        const container = document.createElement("div");
                        container.style.padding = "24px";
                        container.style.maxWidth = "800px";
                        const title = document.createElement("h2");
                        title.innerText = `${currentAssessment.title} — Answer Key`;
                        title.style.marginBottom = "16px";
                        container.appendChild(title);
                        questions.forEach((q, idx) => {
                          const wrap = document.createElement("div");
                          wrap.style.marginBottom = "12px";
                          const h = document.createElement("h4");
                          h.innerText = `Q${idx + 1}. (${q.question_type})`;
                          const p = document.createElement("p");
                          p.innerText = q.question_text;
                          wrap.appendChild(h);
                          wrap.appendChild(p);
                          if (Array.isArray(q.options) && q.options.length) {
                            const ul = document.createElement("ul");
                            q.options.forEach((opt) => {
                              const li = document.createElement("li");
                              li.innerText = opt;
                              ul.appendChild(li);
                            });
                            wrap.appendChild(ul);
                          }
                          const ans = document.createElement("p");
                          ans.innerText = `Answer: ${q.correct_answer}`;
                          ans.style.fontWeight = "600";
                          wrap.appendChild(ans);
                          container.appendChild(wrap);
                        });

                        // Lazy import to avoid bundling if unused
                        const [{ jsPDF }, html2canvas] = await Promise.all([
                          import("jspdf"),
                          import("html2canvas")
                        ]);

                        const canvas = await html2canvas.default(container, { scale: 2 });
                        const imgData = canvas.toDataURL("image/png");
                        const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const imgWidth = pageWidth - 40;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;
                        let y = 20;
                        if (imgHeight < pageHeight) {
                          pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
                        } else {
                          // Paginate
                          let sY = 0;
                          const pageCanvas = document.createElement("canvas");
                          const ctx = pageCanvas.getContext("2d");
                          const ratio = imgWidth / canvas.width;
                          pageCanvas.width = imgWidth;
                          pageCanvas.height = pageHeight - 40;
                          while (sY < canvas.height) {
                            ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
                            ctx.drawImage(canvas, 0, sY, canvas.width, (pageHeight - 40) / ratio, 0, 0, imgWidth, pageCanvas.height);
                            const pageImg = pageCanvas.toDataURL("image/png");
                            pdf.addImage(pageImg, "PNG", 20, 20, imgWidth, pageCanvas.height);
                            sY += (pageHeight - 40) / ratio;
                            if (sY < canvas.height) pdf.addPage();
                          }
                        }
                        pdf.save(`assessment_${id}_answer_key.pdf`);
                        toast.success("PDF generated");
                      } catch (e) {
                        console.error(e);
                        toast.error(e.message || "Failed to generate PDF");
                      }
                    }}
                    className="text-purple-600 hover:text-purple-900"
                  >
                    Print (PDF)
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Prompt</h3>
                  <p className="text-gray-600">{currentAssessment.prompt}</p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">External Links</h3>
                  {currentAssessment.external_links?.length > 0 ? (
                    <ul className="list-disc pl-5 text-gray-600">
                      {currentAssessment.external_links.map((link, index) => (
                        <li key={index}>
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {link}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No external links provided.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Question Blocks</h3>
                  {currentAssessment.question_blocks?.length > 0 ? (
                    <ul className="list-disc pl-5 text-gray-600">
                      {currentAssessment.question_blocks.map((block, index) => (
                        <li key={index}>
                          {block.question_type} (Count: {block.question_count})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No question blocks defined.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Resources</h3>
                  {currentAssessment.resources?.length > 0 ? (
                    <ul className="list-disc pl-5 text-gray-600">
                      {currentAssessment.resources.map((resource, index) => (
                        <li key={index}>{resource.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No resources attached.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Status</h3>
                  <p className="text-gray-600">
                    {currentAssessment.is_executed ? "Executed" : "Draft"}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Created</h3>
                  <p className="text-gray-600">
                    {new Date(currentAssessment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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