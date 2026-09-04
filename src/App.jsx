import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import StudentLayout from "./components/StudentLayout";
import AdminLayout from "./components/AdminLayout";
import AdminRedirect from "./components/AdminRedirect";

// Student pages
import Login from "./pages/student/Login";
import Register from "./pages/student/Register";
import ForgotPassword from "./pages/student/ForgotPassword";
import ResetPassword from "./pages/student/ResetPassword";
import Home from "./pages/student/Home";
import Browse from "./pages/student/Browse";
import QuizDetail from "./pages/student/QuizDetail";
import QuizTaking from "./pages/student/QuizTaking";
import Result from "./pages/student/Result";
import Leaderboard from "./pages/student/Leaderboard";
import History from "./pages/student/History";
import Profile from "./pages/student/Profile";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminQuizzes from "./pages/admin/Quizzes";
import AdminQuizForm from "./pages/admin/QuizForm";
import AdminCodes from "./pages/admin/Codes";
import AdminAds from "./pages/admin/Ads";
import AdminSettings from "./pages/admin/Settings";
import AdminUsers from "./pages/admin/Users";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth (no layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Quiz taking — full-screen, no nav chrome */}
          <Route path="/quiz/:quizId/take" element={<QuizTaking />} />

          {/* Student app — AdminRedirect sends admins to /admin unless they
              explicitly chose to browse the site via the "View Site" button */}
          <Route
            element={
              <AdminRedirect>
                <StudentLayout />
              </AdminRedirect>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/quiz/:quizId" element={<QuizDetail />} />
            <Route path="/quiz/:quizId/result" element={<Result />} />
            <Route path="/quiz/:quizId/leaderboard" element={<Leaderboard />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Admin app */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/quizzes" element={<AdminQuizzes />} />
            <Route path="/admin/quizzes/new" element={<AdminQuizForm />} />
            <Route
              path="/admin/quizzes/:quizId/edit"
              element={<AdminQuizForm />}
            />
            <Route path="/admin/codes" element={<AdminCodes />} />
            <Route path="/admin/ads" element={<AdminAds />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
