import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './lib/auth';
import { Protected } from './components/Protected';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/Confirm';
import UsersPage from './pages/UsersPage';
import ClassesPage from './pages/ClassesPage';
import SubjectsPage from './pages/SubjectsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AdminSchoolsPage from './pages/AdminSchoolsPage';
import EnrollmentsPage from './pages/EnrollmentsPage';
import TeachingPage from './pages/TeachingPage';
import AttendancePage from './pages/AttendancePage';
import GradesPage from './pages/GradesPage';
import MessagesPage from './pages/MessagesPage';
import MyGradesPage from './pages/MyGradesPage';
import MyAttendancePage from './pages/MyAttendancePage';
import ClassAttendanceReport from './pages/ClassAttendanceReport';
import ClassGradesReport from './pages/ClassGradesReport';
import LessonsPage from './pages/LessonsPage';
import './styles.css';

import ErrorPage from './components/ErrorPage';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <Protected>
        <Layout />
      </Protected>
    ),
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'classes', element: <ClassesPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'assignments', element: <AssignmentsPage /> },
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'lessons', element: <LessonsPage /> },
      { path: 'admin/schools', element: <AdminSchoolsPage /> },
      { path: 'enrollments', element: <EnrollmentsPage /> },
      { path: 'teaching', element: <TeachingPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'grades', element: <GradesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'me/grades', element: <MyGradesPage /> },
      { path: 'me/attendance', element: <MyAttendancePage /> },
      { path: 'reports/attendance', element: <ClassAttendanceReport /> },
      { path: 'reports/grades', element: <ClassGradesReport /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
