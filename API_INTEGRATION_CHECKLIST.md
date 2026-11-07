# Thibitisha Skills — API Integration Checklist

| Endpoint | Method | Feature Area | Integrated In Frontend | Status |
|---|---|---|---|---|
| `/api/auth/register` | POST | Authentication | `authApi.register()`, `SignUp.jsx` | Verified |
| `/api/auth/login` | POST | Authentication | `authApi.login()`, `SignIn.jsx` | Verified |
| `/api/auth/me` | GET | Authentication | `authApi.getMe()`, `AuthContext.jsx` | Verified |
| `/api/auth/logout` | POST | Authentication | `authApi.logout()`, `Navbar.jsx` | Verified |
| `/api/auth/change-password` | POST | Authentication | `authApi.changePassword()` | Verified |
| `/api/users/me` | GET | User Account | `usersApi.getMyAccount()`, `CandidateDashboard.jsx` | Verified |
| `/api/users/me` | PUT | User Account | `usersApi.updateMyAccount()` | Verified |
| `/api/candidates/profile` | PUT | Candidate Profile | `usersApi.updateCandidateProfile()`, `CandidateDashboard.jsx` | Verified |
| `/api/users/{user_id}/profile` | GET | Candidate Profile | `usersApi.getUserProfile()` | Verified |
| `/api/employers/profile` | GET | Employer Profile | `employersApi.getProfile()`, `RecruiterHome.jsx` | Verified |
| `/api/employers/profile` | PUT | Employer Profile | `employersApi.updateProfile()`, `RecruiterHome.jsx`, `NewJobPage.jsx` | Verified |
| `/api/employers/my-jobs` | GET | Employer Jobs | `employersApi.getMyJobs()`, `RecruiterJobs.jsx`, `RecruiterHome.jsx` | Verified |
| `/api/cv/upload` | POST | CV Management | `cvApi.uploadCv()`, `CandidateDashboard.jsx`, `ApplyPage.jsx` | Verified |
| `/api/cv/my-cv` | GET | CV Management | `cvApi.getMyCv()`, `CandidateDashboard.jsx`, `ApplyPage.jsx` | Verified |
| `/api/cv/my-cv/history` | GET | CV Management | `cvApi.getMyCvHistory()` | Verified |
| `/api/cv/{cv_id}` | DELETE | CV Management | `cvApi.deleteCv()` | Verified |
| `/api/cv/{cv_id}/analyze` | POST | Gemini CV AI | `cvApi.analyzeCv()`, `CandidateDashboard.jsx`, `ApplyPage.jsx` | Verified |
| `/api/cv/{cv_id}/analysis` | GET | Gemini CV AI | `cvApi.getCvAnalysis()`, `CandidateDashboard.jsx` | Verified |
| `/api/skills` | GET | Skills Catalog | `skillsApi.getSkills()`, `AssessmentPage.jsx`, `NewJobPage.jsx` | Verified |
| `/api/skills/categories` | GET | Skills Catalog | `skillsApi.getCategories()` | Verified |
| `/api/skills/my-skills` | GET | Candidate Skills | `skillsApi.getMySkills()`, `CandidateDashboard.jsx` | Verified |
| `/api/skills/my-skills` | POST | Candidate Skills | `skillsApi.addMySkill()`, `CandidateDashboard.jsx` | Verified |
| `/api/skills/my-skills/{skill_id}` | DELETE | Candidate Skills | `skillsApi.removeMySkill()`, `CandidateDashboard.jsx` | Verified |
| `/api/assessments/start` | POST | Assessments | `assessmentsApi.startAssessment()`, `AssessmentPage.jsx` | Verified |
| `/api/assessments/my-assessments` | GET | Assessments | `assessmentsApi.getMyAssessments()` | Verified |
| `/api/assessments/{id}/questions` | GET | Assessments | `assessmentsApi.getQuestions()`, `AssessmentPage.jsx` | Verified |
| `/api/assessments/{id}/submit` | POST | Assessments | `assessmentsApi.submitAssessment()`, `AssessmentPage.jsx` | Verified |
| `/api/assessments/{id}/results` | GET | Assessments | `assessmentsApi.getResults()`, `AssessmentPage.jsx` | Verified |
| `/api/verifications/my-skills` | GET | Verifications | `assessmentsApi.getMyVerifications()`, `CandidateDashboard.jsx` | Verified |
| `/api/jobs` | GET | Job Listings | `jobsApi.getJobs()`, `JobsPage.jsx` | Verified |
| `/api/jobs/{job_id}` | GET | Job Listings | `jobsApi.getJob()`, `ApplyPage.jsx`, `RecruiterDashboard.jsx` | Verified |
| `/api/jobs` | POST | Employer Jobs | `jobsApi.createJob()`, `NewJobPage.jsx` | Verified |
| `/api/jobs/{job_id}` | PUT | Employer Jobs | `jobsApi.updateJob()`, `RecruiterJobs.jsx` | Verified |
| `/api/jobs/{job_id}/skills` | POST | Job Skills | `jobsApi.addJobSkills()`, `NewJobPage.jsx` | Verified |
| `/api/jobs/{job_id}/apply` | POST | Job Applications | `applicationsApi.applyToJob()`, `ApplyPage.jsx` | Verified |
| `/api/applications/my-applications` | GET | Job Applications | `applicationsApi.getMyApplications()`, `CandidateDashboard.jsx` | Verified |
| `/api/jobs/{job_id}/applications` | GET | Employer Applications | `applicationsApi.getJobApplications()`, `RecruiterDashboard.jsx` | Verified |
| `/api/applications/{id}/status` | PUT | Application Status | `applicationsApi.updateApplicationStatus()`, `RecruiterDashboard.jsx` | Verified |
| `/api/jobs/{job_id}/matches` | GET | Candidate Matching | `jobsApi.getJobMatches()`, `RecruiterDashboard.jsx` | Verified |
| `/api/leaderboard` | GET | Public Rankings | `leaderboardApi.getLeaderboard()`, `LeaderboardPage.jsx` | Verified |
| `/api/leaderboard/{skill_id}` | GET | Skill Rankings | `leaderboardApi.getSkillLeaderboard()`, `LeaderboardPage.jsx` | Verified |
| `/api/voice-interviews/start` | POST | AI Voice Interview | `voiceInterviewsApi.startInterview()`, `InterviewPage.jsx` | Verified |
| `/api/voice-interviews/mine` | GET | AI Voice Interview | `voiceInterviewsApi.getMyInterviews()`, `CandidateDashboard.jsx` | Verified |
| `/api/voice-interviews/{id}` | GET | AI Voice Interview | `voiceInterviewsApi.getInterview()`, `InterviewPage.jsx` | Verified |
| `/api/voice-interviews/{id}/current-question` | GET | AI Voice Interview | `voiceInterviewsApi.getCurrentTurn()`, `InterviewPage.jsx` | Verified |
| `/api/voice-interviews/{id}/answer` | POST | AI Voice Interview | `voiceInterviewsApi.submitTurnAnswer()`, `InterviewPage.jsx` | Verified |

