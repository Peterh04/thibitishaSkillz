import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import JobsPage from "./pages/JobsPage";
import SignIn from "./pages/SignIn";
import SignInPage from "./pages/SignInPage";
import SignUp from "./pages/SignUp";
import ApplyPage from "./pages/ApplyPage";
import CandidateDashboard from "./pages/CandidateDashboard";
import CandidateProfile from "./pages/CandidateProfile";
import AssessmentPage from "./pages/AssessmentPage";
import InterviewPage from "./pages/InterviewPage";
import InterviewSubmitted from "./pages/InterviewSubmitted";
import InterviewResults from "./pages/InterviewResults";
import LeaderboardPage from "./pages/LeaderboardPage";

import RecruiterHome from "./pages/RecruiterHome";
import RecruiterJobs from "./pages/RecruiterJobs";
import NewJobPage from "./pages/NewJobPage";
import RecruiterDashboard from "./pages/RecruiterDashboard";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public & Guest Routes */}
        <Route path="/" element={<JobsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signin-page" element={<SignInPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/apply/:jobId" element={<ApplyPage />} />
        <Route path="/interview/submit" element={<InterviewSubmitted />} />
        <Route path="/interview/results" element={<InterviewResults />} />

        {/* Candidate Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["job_seeker", "admin"]}>
              <CandidateDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["job_seeker", "admin"]}>
              <CandidateProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments"
          element={
            <ProtectedRoute allowedRoles={["job_seeker", "admin"]}>
              <AssessmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessments/:skillId"
          element={
            <ProtectedRoute allowedRoles={["job_seeker", "admin"]}>
              <AssessmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview"
          element={
            <ProtectedRoute allowedRoles={["job_seeker", "admin"]}>
              <InterviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/:interviewId"
          element={
            <ProtectedRoute allowedRoles={["job_seeker", "admin"]}>
              <InterviewPage />
            </ProtectedRoute>
          }
        />

        {/* Recruiter / Employer Protected Routes */}
        <Route
          path="/recruiter"
          element={
            <ProtectedRoute allowedRoles={["employer", "admin"]}>
              <RecruiterHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs"
          element={
            <ProtectedRoute allowedRoles={["employer", "admin"]}>
              <RecruiterJobs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs/new"
          element={
            <ProtectedRoute allowedRoles={["employer", "admin"]}>
              <NewJobPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/jobs/:jobId/candidates"
          element={
            <ProtectedRoute allowedRoles={["employer", "admin"]}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/shortlisted"
          element={
            <ProtectedRoute allowedRoles={["employer", "admin"]}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shortlisted"
          element={
            <ProtectedRoute allowedRoles={["employer", "admin"]}>
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
