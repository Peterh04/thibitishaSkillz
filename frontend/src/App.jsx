import "./App.css";
import SignUp from "./pages/SignUp";
import JobsPage from "./pages/JobsPage";
import ApplyPage from "./pages/ApplyPage";
import InterviewPage from "./pages/InterviewPage";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import { Route, Routes } from "react-router-dom";
import RecruiterHome from "./pages/RecruiterHome";
import RecruiterJobs from "./pages/RecruiterJobs";
RecruiterHome;

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<JobsPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/shortlisted" element={<RecruiterDashboard />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/recruiter" element={<RecruiterHome />} />
        <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
      </Routes>
    </>
  );
}

export default App;
