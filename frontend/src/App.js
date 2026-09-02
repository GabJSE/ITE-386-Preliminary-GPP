// Import routing tools from react-router-dom
import { Routes, Route, useLocation } from "react-router-dom";

// Import all page components used in the app
import Login from "./pages/login/login";
import ForgotPass from "./pages/login/forgotpass";
import Jobs from "./pages/jobhunter_dashboard/Jobs";
import Landing from "./pages/landing/Landing";
import SignUp01 from "./pages/signup/jobhunter/SignUp01";
import SignUp02 from "./pages/signup/jobhunter/SignUp02";
import SignUp04 from "./pages/signup/jobhunter/SignUp04";
import ChooseRole from "./pages/signup/ChooseRole";
import SignUpE01 from "./pages/signup/employer/SignUpE01";
import SignUpE02 from "./pages/signup/employer/SignUpE02";
import SignUpE03 from "./pages/signup/employer/SignUpE03";
import JobhunterDashboard from './pages/jobhunter_dashboard/JobhunterDashboard';
import EmployerDashboard from './pages/employer_dashboard/EmployerDashboard';
import EmployerLayout from './pages/employer_dashboard/EmployerLayout';
import EmployerProfile from './pages/employer_dashboard/EmployerProfile';
import EmployerJobs from './pages/employer_dashboard/JobPosting';
import EmployerApplicants from './pages/employer_dashboard/Applicants';
import EmployerMessages from './pages/employer_dashboard/EmployerMessages';
import EmployerNotifications from './pages/employer_dashboard/Notifications';
import DashboardLayout from './pages/jobhunter_dashboard/DashboardLayout';
import Profile from './pages/jobhunter_dashboard/Profile';
import SavedJobs from './pages/jobhunter_dashboard/SavedJobs';
import Applications from './pages/jobhunter_dashboard/Applications';
import Notifications from './pages/jobhunter_dashboard/JobseekerNotification';
import Messages from './pages/jobhunter_dashboard/JobSeekerMessages';
import Settings from './pages/jobhunter_dashboard/Settings';
import About from "./pages/landing/About";
import Contact from "./pages/landing/Contact";
import Terms from "./pages/landing/Terms";
import Privacy from "./pages/landing/Privacy";


// Admin pages
import AdminLayout from './pages/admin_dashboard/AdminLayout';
import AdminDashboard from './pages/admin_dashboard/AdminDashboard';
import UserManagement from './pages/admin_dashboard/UserManagement';
import JobApprovals from './pages/admin_dashboard/JobApprovals';
import Reports from './pages/admin_dashboard/Reports';
import Analytics from './pages/admin_dashboard/Analytics';

// Layout components
import Header from "./components/Header";
import Footer from "./components/Footer";

// Contexts
import { useAuth } from './contexts/AuthContext';
import { JobsProvider } from './contexts/JobsContext';

// Main App component
function App() {
  const { token } = useAuth();
  const location = useLocation();
  const isDashboardRoute =
    location.pathname.startsWith('/employer') ||
    location.pathname.startsWith('/jobhunter') ||
    location.pathname.startsWith('/admin');

  return (
    <JobsProvider>
      <div className="App">
        {!isDashboardRoute && <Header />}

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/messages" element={<Messages />} />

          {/* Employer Dashboard */}
          <Route path="/employer" element={<EmployerLayout />}>
            <Route path="dashboard" element={<EmployerDashboard />} />
            <Route path="profile" element={<EmployerProfile />} />
            <Route path="jobPosting" element={<EmployerJobs />} />
            <Route path="applicants" element={<EmployerApplicants />} />
            <Route path="messages" element={<EmployerMessages />} />
            <Route path="notifications" element={<EmployerNotifications />} />
          </Route>

          {/* Jobhunter Dashboard */}
          <Route path="/jobhunter" element={<DashboardLayout />}>
            <Route path="dashboard" element={<JobhunterDashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="saved-jobs" element={<SavedJobs />} />
            <Route path="applications" element={<Applications />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="messages" element={<Messages />} />
          </Route>

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="jobs" element={<JobApprovals />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>

          {/* Auth & Signup */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPass />} />
          <Route path="/signup-01" element={<SignUp01 />} />
          <Route path="/signup-02" element={<SignUp02 />} />
          <Route path="/signup-04" element={<SignUp04 />} />
          <Route path="/choose-role" element={<ChooseRole />} />
          <Route path="/employer-signup-01" element={<SignUpE01 />} />
          <Route path="/employer-signup-02" element={<SignUpE02 />} />
          <Route path="/employer-signup-03" element={<SignUpE03 />} />


          {/* Footer Link Pages */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

        </Routes>
        {!token && !isDashboardRoute && <Footer />}
      </div>
    </JobsProvider>
  );
}

export default App;
