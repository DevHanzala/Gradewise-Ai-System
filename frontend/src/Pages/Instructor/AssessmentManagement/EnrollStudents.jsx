import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import useAssessmentStore from "../../../store/assessmentStore.js";
import { Card, CardHeader, CardContent } from "../../../components/ui/Card";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Modal from "../../../components/ui/Modal";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import toast from "react-hot-toast";

function EnrollStudents() {
  const { assessmentId } = useParams();
  const { enrolledStudents, loading, getEnrolledStudents, enrollStudent, enrollStudentsByEmail, unenrollStudent } = useAssessmentStore();
  const [singleEmail, setSingleEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [modal, setModal] = useState({ isOpen: false, type: "info", title: "", message: "" });

  useEffect(() => {
    getEnrolledStudents(assessmentId);
  }, [assessmentId, getEnrolledStudents]);

  const handleSingleEnroll = async (e) => {
    e.preventDefault();
    if (!singleEmail.trim()) {
      toast.error("Enter an email");
      return;
    }
    try {
      await enrollStudent(assessmentId, singleEmail);
      toast.success("Student enrolled");
      setSingleEmail("");
      getEnrolledStudents(assessmentId);
    } catch (error) {
      toast.error(error.message || "Failed to enroll student");
    }
  };

  const handleBulkEnroll = async (e) => {
    e.preventDefault();
    const emails = bulkEmails.split("\n").map((email) => email.trim()).filter(Boolean);
    if (emails.length === 0) {
      toast.error("Enter at least one email");
      return;
    }
    try {
      await enrollStudentsByEmail(assessmentId, emails);
      toast.success(`${emails.length} students enrolled`);
      setBulkEmails("");
      getEnrolledStudents(assessmentId);
    } catch (error) {
      toast.error(error.message || "Failed to enroll students");
    }
  };

  const handleUnenroll = async (studentId) => {
    if (window.confirm("Unenroll this student?")) {
      try {
        await unenrollStudent(assessmentId, studentId);
        toast.success("Student unenrolled");
        getEnrolledStudents(assessmentId);
      } catch (error) {
        toast.error(error.message || "Failed to unenroll student");
      }
    }
  };

  const showModal = (type, title, message) => {
    setModal({ isOpen: true, type, title, message });
  };

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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Enroll Students</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Single Enroll */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Enroll Single Student</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingleEnroll} className="space-y-4">
                <input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="Student email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Enroll
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Bulk Enroll */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Enroll</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkEnroll} className="space-y-4">
                <textarea
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  placeholder="Enter emails, one per line"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Enroll Bulk
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
        {/* Enrolled Students List */}
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Enrolled Students ({enrolledStudents.length})</h2>
          </CardHeader>
          <CardContent>
            {enrolledStudents.map((student) => (
              <div key={student.id} className="flex justify-between items-center mb-4">
                <p>{student.name} ({student.email})</p>
                <button onClick={() => handleUnenroll(student.id)} className="text-red-600">
                  Unenroll
                </button>
              </div>
            ))}
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

export default EnrollStudents;