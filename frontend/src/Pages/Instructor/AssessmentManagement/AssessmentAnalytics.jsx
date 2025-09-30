import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import useInstructorAnalyticsStore from "../../../store/useInstructorAssessmentAnalyticsStore";
import { FaList, FaTable, FaUser, FaCalendarAlt, FaPercentage, FaClock, FaCheckCircle } from "react-icons/fa";

function AssessmentAnalytics() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { loading, error, assessments, students, fetchAssessments, fetchAssessmentStudents } = useInstructorAnalyticsStore();
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => {
    console.log("🔄 Fetching assessments...");
    fetchAssessments();
  }, [fetchAssessments]);

  useEffect(() => {
    const isValidAssessmentId = assessmentId && !isNaN(assessmentId) && assessmentId !== ':assessmentId';
    if (isValidAssessmentId) {
      console.log(`🔄 Fetching students for assessment ${assessmentId}`);
      fetchAssessmentStudents(assessmentId);
      const assessment = assessments.find(a => a.id === Number(assessmentId));
      setSelectedAssessment(assessment || null);
    } else {
      setSelectedAssessment(null);
    }
  }, [assessmentId, fetchAssessmentStudents, assessments]);

  console.log("🌐 Rendering with:", { assessmentId, assessments, students, loading, error });

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
        <p className="text-red-500 text-lg">Error loading analytics: {error}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessment Analytics</h1>
        <p className="text-gray-600">Track your assessments and student performance</p>

        <div className="mt-6">
          <Card className="shadow-lg bg-white rounded-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
              <h3 className="text-lg font-semibold flex items-center">
                <FaList className="mr-2" /> My Executed Assessments
              </h3>
            </CardHeader>
            <CardContent>
              {assessments.length > 0 ? (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all ${assessment.id === Number(assessmentId) ? 'bg-blue-50 border-blue-500' : ''}`}
                      onClick={() => navigate(`/instructor/assessments/${assessment.id}/analytics`)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900 flex items-center">
                            <FaUser className="mr-2 text-blue-600" /> {assessment.title}
                          </p>
                          <p className="text-sm text-gray-600">
                            <FaCalendarAlt className="mr-1 inline" /> Created: {new Date(assessment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600 flex items-center">
                            <FaCheckCircle className="mr-1" /> {assessment.completed_attempts} Completed
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No executed assessments found. Create or execute an assessment to see analytics.</p>
              )}
            </CardContent>
          </Card>

          {assessmentId && !isNaN(assessmentId) && assessmentId !== ':assessmentId' && (
            <div className="mt-8 space-y-6">
              <Card className="shadow-lg bg-white rounded-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl">
                  <h3 className="text-lg font-semibold flex items-center">
                    <FaTable className="mr-2" /> Students' Results for {selectedAssessment?.title || 'Selected Assessment'}
                  </h3>
                </CardHeader>
                <CardContent>
                  {students.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaUser className="mr-2 inline" /> Student Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaList className="mr-2 inline" /> Total Questions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaCheckCircle className="mr-2 inline" /> Correct Answers
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaCalendarAlt className="mr-2 inline" /> Attempt Date & Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaPercentage className="mr-2 inline" /> Score (%)
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaClock className="mr-2 inline" /> Time Used
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <FaCheckCircle className="mr-2 inline" /> Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {students.map((student) => (
                            <tr key={student.student_id}>
                              <td className="px-6 py-4 whitespace-nowrap">{student.name || `User ${student.student_id}`}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{student.total_questions || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{student.correct_answers || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {new Date(student.completed_at).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">{student.percentage}%</td>
                              <td className="px-6 py-4 whitespace-nowrap">{student.time_used}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{student.status || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No students have completed this assessment</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default AssessmentAnalytics;