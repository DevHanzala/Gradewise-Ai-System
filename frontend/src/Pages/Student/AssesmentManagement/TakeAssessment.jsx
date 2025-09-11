import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useStudentAssessmentStore from "../../../store/studentAssessmentStore.js";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Modal from "../../../components/ui/Modal";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import toast from "react-hot-toast";

function TakeAssessment() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const {
    assessmentQuestions,
    timeRemaining,
    loading,
    error,
    startAssessment,
    updateAnswer,
    submitAssessment,
    printPaper,
    decrementTime,
    isSubmitted,
  } = useStudentAssessmentStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" });

  // Start assessment on mount
  useEffect(() => {
    startAssessment(assessmentId);
  }, [assessmentId, startAssessment]);

  // Timer management
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(decrementTime, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining <= 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeRemaining, isSubmitted, decrementTime]);

  // Handle answer updates
  const handleAnswerUpdate = (questionId, answer) => {
    updateAnswer(questionId, answer);
  };

  // Handle assessment submission
  const handleSubmit = async () => {
    try {
      await submitAssessment(assessmentId);
      setModal({ isOpen: true, type: "success", title: "Submitted", message: "Assessment submitted successfully!" });
    } catch (err) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Submission Error",
        message: err.message || "Failed to submit assessment.",
      });
    }
  };

  // Handle navigation between questions
  const handleNext = () => {
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle print
  const handlePrint = async () => {
    try {
      await printPaper(assessmentId);
      toast.success("Assessment printed with answer keys.");
    } catch (err) {
      toast.error(err.message || "Failed to print assessment.");
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="mt-4 px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // Submitted state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Assessment Completed</h1>
          <div className="flex space-x-4">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Print with Keys
            </button>
            <button
              onClick={() => navigate("/student/dashboard")}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
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

  // Main assessment interface
  const currentQuestion = assessmentQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Take Assessment</h1>
          <div className="text-lg font-semibold text-gray-700">
            Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
          </div>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">
              Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
            </h2>
          </CardHeader>
          <CardContent>
            {currentQuestion && (
              <div className="space-y-6">
                <p className="text-lg">{currentQuestion.text}</p>
                {currentQuestion.type === "multiple_choice" && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={currentQuestion.answer === option}
                          onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                {currentQuestion.type === "short_answer" && (
                  <textarea
                    value={currentQuestion.answer || ""}
                    onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter your answer"
                  />
                )}
                {currentQuestion.type === "true_false" && (
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value="true"
                        checked={currentQuestion.answer === "true"}
                        onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">True</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value="false"
                        checked={currentQuestion.answer === "false"}
                        onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">False</span>
                    </label>
                  </div>
                )}
                {currentQuestion.type === "matching" && (
                  <div className="space-y-4">
                    {currentQuestion.first_side.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <span>{item}</span>
                        <select
                          value={currentQuestion.answer[index] || ""}
                          onChange={(e) =>
                            handleAnswerUpdate(currentQuestion.id, {
                              ...currentQuestion.answer,
                              [index]: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select</option>
                          {currentQuestion.second_side.map((option, i) => (
                            <option key={i} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentQuestionIndex === assessmentQuestions.length - 1}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <button
              onClick={handleSubmit}
              className="mt-4 w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Submit Assessment
            </button>
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

export default TakeAssessment;