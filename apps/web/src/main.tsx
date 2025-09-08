import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AuthProvider } from './lib/auth';
import { Protected } from './components/Protected';
import { Layout } from './components/Layout';
import UsersPage from './pages/UsersPage';
import ClassesPage from './pages/ClassesPage';
import SubjectsPage from './pages/SubjectsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import './styles.css';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <Protected>
        <Layout />
      </Protected>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'classes', element: <ClassesPage /> },
      { path: 'subjects', element: <SubjectsPage /> },
      { path: 'assignments', element: <AssignmentsPage /> },
      { path: 'announcements', element: <AnnouncementsPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
