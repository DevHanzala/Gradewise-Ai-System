import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import toast from "react-hot-toast";
import useStudentAnalyticsStore from "../../store/useStudentAnalyticsStore.js";
import Recommendations from "../../components/Recommendations.jsx";
import { FaCheck, FaTimes, FaClock, FaBook, FaChartLine } from "react-icons/fa";

const StudentAnalytics = () => {
  const {
    assessments,
    selectedAssessment,
    selectedAssessmentDetails,
    loading,
    error,
    fetchAssessments,
    fetchAssessmentDetails,
    setSelectedAssessment,
    downloadReport,
  } = useStudentAnalyticsStore();

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  useEffect(() => {
    if (selectedAssessment) {
      fetchAssessmentDetails(selectedAssessment).then(() => {
        console.log("Selected Assessment Details:", selectedAssessmentDetails);
      }).catch(err => console.error("Error fetching details:", err));
    }
  }, [selectedAssessment, fetchAssessmentDetails]);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds <= 0) return "0h 0m 0s";
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  const calculateAssessmentStats = (details) => {
    if (!details || !details.recommendations?.weak_areas) return { total: 0, correct: 0, incorrect: 0 };
    const total = details.recommendations.weak_areas.length + (details.score / 100 * 5); // Assuming 5 questions
    const correct = Math.round(total * (details.score / 100));
    const incorrect = total - correct;
    return { total, correct, incorrect };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-red-500 text-lg">Error loading analytics: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <div className="text-3xl">📚</div>
          <span className="text-2xl font-bold text-blue-600 ml-2">Gradewise AI</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Analytics</h1>
        <p className="text-gray-600">Track your progress and identify areas for improvement</p>

        <div className="mt-6">
          <Card className="shadow-lg bg-white rounded-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
              <h3 className="text-lg font-semibold">My Assessments <FaChartLine className="inline ml-2" /></h3>
            </CardHeader>
            <CardContent>
              {assessments.length > 0 ? (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all ${selectedAssessment === assessment.id ? 'bg-blue-50 border-blue-500' : ''}`}
                      onClick={() => setSelectedAssessment(assessment.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{assessment.title}</p>
                          <p className="text-sm text-gray-600">Date: {new Date(assessment.date).toLocaleDateString()}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Score: {Math.round(assessment.percentage)}% <FaCheck className="inline text-green-500" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No assessments completed yet <FaBook className="inline" /></p>
              )}
            </CardContent>
          </Card>

          {selectedAssessment && selectedAssessmentDetails && (
            <div className="mt-8 space-y-6">
              <Card className="shadow-lg bg-white rounded-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
                  <h3 className="text-lg font-semibold">Assessment Details <FaBook className="inline ml-2" /></h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center">
                      <FaBook className="text-blue-500 mr-2" />
                      <p className="text-sm font-medium text-gray-600">Title</p>
                      <p className="text-lg font-medium text-gray-900 ml-2">{selectedAssessmentDetails.assessment_title || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                      <FaCheck className="text-green-500 mr-2" />
                      <p className="text-sm font-medium text-gray-600">Score</p>
                      <p className="text-3xl font-bold text-gray-900 ml-2">{selectedAssessmentDetails.score}%</p>
                    </div>
                    <div className="flex items-center">
                      <FaClock className="text-yellow-500 mr-2" />
                      <p className="text-sm font-medium text-gray-600">Time Taken</p>
                      <p className="text-lg font-medium text-gray-900 ml-2">{formatTime(selectedAssessmentDetails.time_taken || 0)}</p>
                    </div>
                    {selectedAssessmentDetails.recommendations && (
                      <div className="flex items-center">
                        <FaChartLine className="text-purple-500 mr-2" />
                        <p className="text-sm font-medium text-gray-600">Total Questions</p>
                        <p className="text-lg font-medium text-gray-900 ml-2">
                          {calculateAssessmentStats(selectedAssessmentDetails).total}
                        </p>
                      </div>
                    )}
                    {selectedAssessmentDetails.recommendations && (
                      <div className="flex items-center">
                        <FaCheck className="text-green-500 mr-2" />
                        <p className="text-sm font-medium text-gray-600">Correct Answers</p>
                        <p className="text-lg font-medium text-gray-900 ml-2">
                          {calculateAssessmentStats(selectedAssessmentDetails).correct}
                        </p>
                      </div>
                    )}
                    {selectedAssessmentDetails.recommendations && (
                      <div className="flex items-center">
                        <FaTimes className="text-red-500 mr-2" />
                        <p className="text-sm font-medium text-gray-600">Incorrect Answers</p>
                        <p className="text-lg font-medium text-gray-900 ml-2">
                          {calculateAssessmentStats(selectedAssessmentDetails).incorrect}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-white rounded-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
                  <h3 className="text-lg font-semibold">Learning Recommendations <FaChartLine className="inline ml-2" /></h3>
                </CardHeader>
                <CardContent>
                  {selectedAssessmentDetails.recommendations ? (
                    <>
                      <h4 className="text-md font-semibold text-gray-700">Areas of Improvement</h4>
                      {selectedAssessmentDetails.recommendations.weak_areas && selectedAssessmentDetails.recommendations.weak_areas.length > 0 ? (
                        <Recommendations recommendations={selectedAssessmentDetails.recommendations} />
                      ) : (
                        <p className="text-gray-500 text-center py-2">No specific weak areas identified.</p>
                      )}
                      <h4 className="text-md font-semibold text-gray-700 mt-4">Study Plan</h4>
                      {selectedAssessmentDetails.recommendations.study_plan ? (
                        <div className="mt-2">
                          <h5 className="text-sm font-medium text-gray-600">Daily Practice <FaClock className="inline ml-1" /></h5>
                          <ul className="list-disc pl-5">
                            {selectedAssessmentDetails.recommendations.study_plan.daily_practice.map((item, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                {item.topic}: {item.focus} ({item.time_allocation || 'N/A'})
                              </li>
                            ))}
                          </ul>
                          <h5 className="text-sm font-medium text-gray-600 mt-2">Weekly Review <FaChartLine className="inline ml-1" /></h5>
                          <ul className="list-disc pl-5">
                            {selectedAssessmentDetails.recommendations.study_plan.weekly_review.map((item, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                {item.topic}: {item.activity} - {item.goal || 'N/A'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-2">No study plan available.</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Loading recommendations...</p>
                  )}
                </CardContent>
              </Card>

              <div className="text-center">
                <button
                  onClick={() => downloadReport(selectedAssessment)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center"
                >
                  <FaBook className="mr-2" /> Download Assessment Report
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default StudentAnalytics;