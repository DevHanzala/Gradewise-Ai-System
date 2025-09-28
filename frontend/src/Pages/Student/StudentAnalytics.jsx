import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import toast from "react-hot-toast";
import useStudentAnalyticsStore from "../../store/useStudentAnalyticsStore.js";
import Recommendations from "../../components/Recommendations.jsx";

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
    seconds = Math.floor(seconds); // Fix decimal precision
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">Error loading analytics: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">My Analytics</h1>
        <p className="mt-2 text-gray-600">Track your progress and identify areas for improvement</p>

        <div className="mt-6">
          <Card className="shadow-md">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">My Assessments</h3>
            </CardHeader>
            <CardContent>
              {assessments.length > 0 ? (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${selectedAssessment === assessment.id ? 'bg-blue-50 border-blue-500' : ''}`}
                      onClick={() => setSelectedAssessment(assessment.id)} // Fixed get() error
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{assessment.title}</p>
                          <p className="text-sm text-gray-600">Date: {new Date(assessment.date).toLocaleDateString()}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Score: {Math.round(assessment.percentage)}% {/* Fix floating point */}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No assessments completed yet</p>
              )}
            </CardContent>
          </Card>

          {selectedAssessment && selectedAssessmentDetails && (
            <div className="mt-8 space-y-6">
              <Card className="shadow-md">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Assessment Details</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Title</p>
                      <p className="text-lg font-medium text-gray-900">{selectedAssessmentDetails.assessment_title || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Score</p>
                      <p className="text-3xl font-bold text-gray-900">{selectedAssessmentDetails.score}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Time Taken</p>
                      <p className="text-lg font-medium text-gray-900">{formatTime(selectedAssessmentDetails.time_taken || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Learning Recommendations</h3>
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
                          <h5 className="text-sm font-medium text-gray-600">Daily Practice</h5>
                          <ul className="list-disc pl-5">
                            {selectedAssessmentDetails.recommendations.study_plan.daily_practice.map((item, index) => (
                              <li key={index} className="text-sm text-gray-700">
                                {item.topic}: {item.focus} ({item.time_allocation || 'N/A'})
                              </li>
                            ))}
                          </ul>
                          <h5 className="text-sm font-medium text-gray-600 mt-2">Weekly Review</h5>
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
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download Assessment Report
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