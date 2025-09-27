import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "../../components/ui/Card";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import toast from "react-hot-toast";
import useStudentAnalyticsStore from "../../store/useStudentAnalyticsStore.js";
import PerformanceChart from "../../components/PerformanceChart.jsx";
import Recommendations from "../../components/Recommendations.jsx";

const StudentAnalytics = () => {
  const {
    analytics,
    performance,
    recommendations,
    loading,
    error,
    fetchOverview,
    fetchPerformance,
    fetchRecommendations,
    downloadReport,
  } = useStudentAnalyticsStore();
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    fetchOverview();
    fetchPerformance(timeRange);
    fetchRecommendations();
  }, [fetchOverview, fetchPerformance, fetchRecommendations, timeRange]);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds <= 0) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Analytics</h1>
          <p className="mt-2 text-gray-600">Track your progress and identify areas for improvement</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics?.total_assessments || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(analytics?.average_score || 0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Time Spent</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(analytics?.total_time_spent || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Strengths</p>
                  <p className="text-2xl font-bold text-gray-900">{(analytics?.strengths || []).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Strengths & Weaknesses */}
          <div className="space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">My Strengths</h3>
              </CardHeader>
              <CardContent>
                {analytics?.strengths && analytics.strengths.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.strengths.map((strength, index) => (
                      <div key={index} className="p-3 bg-green-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-green-800">{strength.topic || "Unknown"}</p>
                            <p className="text-sm text-green-600">{strength.question_type || "N/A"} • {strength.difficulty || "N/A"}</p>
                          </div>
                          <span className="text-sm font-medium text-green-700">
                            {Math.round((strength.score / (strength.max_score || 1)) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No strengths identified yet</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Areas for Improvement</h3>
              </CardHeader>
              <CardContent>
                {analytics?.weaknesses && analytics.weaknesses.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.weaknesses.map((weakness, index) => (
                      <div key={index} className="p-3 bg-red-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-red-800">{weakness.topic || "Unknown"}</p>
                            <p className="text-sm text-red-600">{weakness.question_type || "N/A"} • {weakness.difficulty || "N/A"}</p>
                          </div>
                          <span className="text-sm font-medium text-red-700">
                            {Math.round((weakness.score / (weakness.max_score || 1)) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No areas for improvement identified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance Trend */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Performance Trend</h3>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {performance.length > 0 ? (
                <PerformanceChart performance={performance} />
              ) : (
                <p className="text-gray-500 text-center py-4">No performance data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Learning Recommendations */}
        <Card className="mt-8 shadow-md">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Learning Recommendations</h3>
          </CardHeader>
          <CardContent>
            {recommendations && recommendations.weak_areas && recommendations.weak_areas.length > 0 ? (
              <Recommendations recommendations={recommendations} />
            ) : (
              <p className="text-gray-500 text-center py-4">No recommendations available</p>
            )}
          </CardContent>
        </Card>

        {/* Download Report Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => downloadReport()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download Analytics Report
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default StudentAnalytics;