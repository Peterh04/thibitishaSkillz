import "./App.css";
import SignUp from "./pages/SignUp";
import JobsPage from "./pages/JobsPage";
import ApplyPage from "./pages/ApplyPage";
import InterviewPage from "./pages/InterviewPage";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import { Route, Routes } from "react-router-dom";
import RecruiterHome from "./pages/RecruiterHome";
import RecruiterJobs from "./pages/RecruiterJobs";
import SignInPage from "./pages/SignInPage";
import CandidateProfile from "./pages/CandidateProfile";
import InterviewSubmitted from "./pages/InterviewSubmitted";
import InterviewResults from "./pages/InterviewResults";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<JobsPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="recruiter/shortlisted" element={<RecruiterDashboard />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/recruiter" element={<RecruiterHome />} />
        <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/profile" element={<CandidateProfile />} />
        <Route path="/interview/submit" element={<InterviewSubmitted />} />
        <Route path="/interview/results" element={<InterviewResults />} />
      </Routes>
    </>
  );
}

export default App;
