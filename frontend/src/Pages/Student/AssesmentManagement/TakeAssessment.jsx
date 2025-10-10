import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useStudentAssessmentStore from "../../../store/studentAssessmentStore.js";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Modal from "../../../components/ui/Modal";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import toast from "react-hot-toast";
import { FaClock, FaQuestion, FaCheck, FaArrowLeft, FaArrowRight, FaPaperPlane } from "react-icons/fa";

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
    decrementTime,
    isSubmitted,
    hasStarted,
    clearError,
  } = useStudentAssessmentStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const autoSubmitRef = useRef(false);

  // Start assessment
  const handleStart = useCallback(async () => {
    try {
      await startAssessment(assessmentId, selectedLanguage);
      if (useStudentAssessmentStore.getState().hasStarted) {
        toast.success("Assessment started!");
      } else {
        toast.error("Failed to start assessment. Please try again.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to start assessment");
    }
  }, [assessmentId, selectedLanguage, startAssessment]);

  // Submit assessment
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || autoSubmitRef.current || !hasStarted) return;
    try {
      setIsSubmitting(true);
      autoSubmitRef.current = true;
      const answeredCount = assessmentQuestions.filter(q => q.answer !== undefined).length;
      if (answeredCount < assessmentQuestions.length) {
        throw new Error(`Please answer all ${assessmentQuestions.length} questions before submitting.`);
      }
      await submitAssessment(assessmentId);
      if (useStudentAssessmentStore.getState().isSubmitted) {
        setModal({
          isOpen: true,
          type: "success",
          title: "Submitted",
          message: "Assessment submitted successfully!",
        });
        toast.success("Assessment submitted successfully!");
      } else {
        toast.error("Failed to submit assessment. Please try again.");
      }
    } catch (err) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Submission Error",
        message: err.message || "Failed to submit assessment.",
      });
      toast.error(err.message || "Failed to submit assessment.");
    } finally {
      setIsSubmitting(false);
    }
  }, [assessmentId, isSubmitting, hasStarted, submitAssessment, assessmentQuestions]);

  // Timer management
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted && hasStarted) {
      const timer = setInterval(decrementTime, 1000);
      return () => clearInterval(timer);
    } else if (timeRemaining <= 0 && !isSubmitted && hasStarted && !autoSubmitRef.current) {
      handleSubmit();
    }
  }, [timeRemaining, isSubmitted, hasStarted, decrementTime, handleSubmit]);

  // Per-question timer
  const perQuestionSeconds = Math.max(
    20,
    Math.floor((timeRemaining || 0) / Math.max(assessmentQuestions.length, 1))
  );
  const [questionTimeLeft, setQuestionTimeLeft] = useState(perQuestionSeconds);

  useEffect(() => {
    if (!hasStarted || isSubmitted || assessmentQuestions.length === 0) return;
    setQuestionTimeLeft(perQuestionSeconds);
  }, [currentQuestionIndex, assessmentQuestions.length, hasStarted, isSubmitted, perQuestionSeconds]);

  useEffect(() => {
    if (!hasStarted || isSubmitted || isSubmitting || assessmentQuestions.length === 0) return;
    const timer = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentQuestionIndex < assessmentQuestions.length - 1) {
            setCurrentQuestionIndex((idx) => idx + 1);
            return perQuestionSeconds;
          } else if (!autoSubmitRef.current) {
            handleSubmit();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isSubmitted, isSubmitting, currentQuestionIndex, assessmentQuestions.length, perQuestionSeconds, handleSubmit]);

  // Handle answer updates
  const handleAnswerUpdate = (questionId, answer) => {
    updateAnswer(questionId, answer);
  };

  // Navigation
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

  // Loading state
  if (loading && !hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => {
              clearError();
              navigate("/student/dashboard");
            }}
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Assessment Completed</h1>
          <div className="flex">
            <button
              onClick={() => {
                clearError();
                navigate("/student/dashboard");
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
        <Modal
          isOpen={modal.isOpen}
          onClose={() => {
            setModal({ ...modal, isOpen: false });
            clearError();
            navigate("/student/dashboard");
          }}
          type={modal.type}
          title={modal.title}
        >
          {modal.message}
        </Modal>
      </div>
    );
  }

  // Pre-start language selection UI
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navbar />
        <div className="max-w-2xl mx-auto py-10 px-4">
          <Card className="shadow-lg bg-white rounded-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
              <h2 className="text-xl font-semibold flex items-center">
                <FaQuestion className="mr-2" /> Start Assessment
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Select language for AI content</label>
                <select
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                  <option value="ar">Arabic</option>
                  <option value="fa">Persian</option>
                </select>
                <button
                  onClick={handleStart}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
                  disabled={loading}
                >
                  <FaCheck className="mr-2" /> Start
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Main assessment interface
  const currentQuestion = assessmentQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Take Assessment</h1>
          <div className="text-lg font-semibold text-gray-700 flex items-center">
            <FaClock className="mr-2" /> Time Remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")} • Question: {questionTimeLeft}s
          </div>
        </div>
        <Card className="shadow-lg bg-white rounded-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
            <h2 className="text-xl font-semibold flex items-center">
              <FaQuestion className="mr-2" /> Question {currentQuestionIndex + 1} of {assessmentQuestions.length}
            </h2>
          </CardHeader>
          <CardContent>
            {currentQuestion && (
              <div className="space-y-6">
                <p className="text-lg text-gray-800">{currentQuestion.question_text}</p>
                {currentQuestion.question_type === "multiple_choice" && (
                  <div className="space-y-2">
                    {currentQuestion.options?.map((option, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option}
                          checked={currentQuestion.answer === option}
                          onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                {currentQuestion.question_type === "true_false" && (
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value="true"
                        checked={currentQuestion.answer === "true"}
                        onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-gray-700">True</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value="false"
                        checked={currentQuestion.answer === "false"}
                        onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-gray-700">False</span>
                    </label>
                  </div>
                )}
                {currentQuestion.question_type === "matching" && currentQuestion.options && Array.isArray(currentQuestion.options) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center">
                          <span className="font-medium text-gray-700 w-1/2">{Object.values(option)[0]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {currentQuestion.options.map((option, index) => (
                        <select
                          key={index}
                          value={currentQuestion.answer?.[index]?.[1] || ""}
                          onChange={(e) => {
                            const newAnswer = [...(currentQuestion.answer || currentQuestion.options)];
                            newAnswer[index][1] = e.target.value;
                            handleAnswerUpdate(currentQuestion.id, newAnswer);
                          }}
                          className="w-full border rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select match</option>
                          {currentQuestion.options.map((opt) => (
                            <option key={JSON.stringify(opt)} value={Object.values(opt)[1]}>{Object.values(opt)[1]}</option>
                          ))}
                        </select>
                      ))}
                    </div>
                  </div>
                )}
                {currentQuestion.question_type === "short_answer" && (
                  <div>
                    <input
                      type="text"
                      value={currentQuestion.answer || ""}
                      onChange={(e) => handleAnswerUpdate(currentQuestion.id, e.target.value)}
                      className="w-full border rounded px-3 py-2 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Type your answer here"
                    />
                  </div>
                )}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center"
                  >
                    <FaArrowLeft className="mr-2" /> Previous
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentQuestionIndex === assessmentQuestions.length - 1}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    Next <FaArrowRight className="ml-2" />
                  </button>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !hasStarted || assessmentQuestions.filter(q => q.answer !== undefined).length < assessmentQuestions.length}
                  className="mt-4 w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">Submitting...</span>
                    </div>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" /> Submit Assessment
                    </>
                  )}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
      <Modal
        isOpen={modal.isOpen}
        onClose={() => {
          setModal({ ...modal, isOpen: false });
          if (modal.type === "success") {
            navigate("/student/dashboard");
          }
        }}
        type={modal.type}
        title={modal.title}
      >
        {modal.message}
      </Modal>
    </div>
  );
}

export default TakeAssessment;