/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateGroup from './pages/CreateGroup';
import GroupDetails from './pages/GroupDetails';
import JoinGroup from './pages/JoinGroup';
import CreateBet from './pages/CreateBet';
import BetDetails from './pages/BetDetails';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create-group" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
              <Route path="/join/:groupId" element={<ProtectedRoute><JoinGroup /></ProtectedRoute>} />
              <Route path="/group/:groupId" element={<ProtectedRoute><GroupDetails /></ProtectedRoute>} />
              <Route path="/group/:groupId/create-bet" element={<ProtectedRoute><CreateBet /></ProtectedRoute>} />
              <Route path="/group/:groupId/bet/:betId" element={<ProtectedRoute><BetDetails /></ProtectedRoute>} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
