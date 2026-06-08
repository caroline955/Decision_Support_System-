import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminStats from "./pages/admin/AdminStats";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminClasses from "./pages/admin/AdminClasses";

import TeacherLayout from "./layouts/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClassDetail from "./pages/teacher/TeacherClassDetail";
import TeacherSchedules from "./pages/teacher/TeacherSchedules";
import TeacherAlerts from "./pages/teacher/TeacherAlerts";

import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentChat from "./pages/student/StudentChat";
import StudentSchedules from "./pages/student/StudentSchedules";
import StudentHistory from "./pages/student/StudentHistory";

function RoleGate({ allow, children }: { allow: string[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "teacher") return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        path="/admin"
        element={<RoleGate allow={["admin"]}><AdminLayout /></RoleGate>}
      >
        <Route index element={<AdminStats />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="classes" element={<AdminClasses />} />
      </Route>

      <Route
        path="/teacher"
        element={<RoleGate allow={["teacher", "admin"]}><TeacherLayout /></RoleGate>}
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="classes/:classId" element={<TeacherClassDetail />} />
        <Route path="schedules" element={<TeacherSchedules />} />
        <Route path="alerts" element={<TeacherAlerts />} />
      </Route>

      <Route
        path="/student"
        element={<RoleGate allow={["student"]}><StudentLayout /></RoleGate>}
      >
        <Route index element={<StudentDashboard />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="schedules" element={<StudentSchedules />} />
        <Route path="history" element={<StudentHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
