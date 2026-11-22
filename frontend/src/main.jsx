// App entry: all pages and who can open them.
// HashRouter keeps URLs like /#/admin so refreshing any page works on S3 (which has no server routing).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getUser } from './services/auth.js';
import Header from './components/Header.jsx';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import StudentHome from './pages/student/Home.jsx';
import TakeQuiz from './pages/student/Quiz.jsx';
import StudentResult from './pages/student/Result.jsx';
import AdminHome from './pages/admin/Home.jsx';
import EditQuiz from './pages/admin/Quiz.jsx';
import QuizResults from './pages/admin/Results.jsx';
import './styles.css';

// Sends logged-out users to login, and each role away from the other role's pages.
// This is only for convenience: the API checks the role on every request.
function Protected({ role, children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && !user.isAdmin) return <Navigate to="/student" replace />;
  if (role === 'student' && user.isAdmin) return <Navigate to="/admin" replace />;
  return (
    <>
      <Header user={user} />
      <main className="container">{children}</main>
    </>
  );
}

function HomeRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.isAdmin ? '/admin' : '/student'} replace />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/student" element={<Protected role="student"><StudentHome /></Protected>} />
        <Route path="/student/quiz/:quizId" element={<Protected role="student"><TakeQuiz /></Protected>} />
        <Route path="/student/result/:quizId" element={<Protected role="student"><StudentResult /></Protected>} />

        <Route path="/admin" element={<Protected role="admin"><AdminHome /></Protected>} />
        <Route path="/admin/quiz/:quizId" element={<Protected role="admin"><EditQuiz /></Protected>} />
        <Route path="/admin/quiz/:quizId/results" element={<Protected role="admin"><QuizResults /></Protected>} />

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
