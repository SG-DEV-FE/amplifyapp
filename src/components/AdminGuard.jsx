import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AdminGuard = ({ children, fallback = null, showMessage = false }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return fallback || (showMessage && (
      <div className="text-center p-4 text-gray-500">
        Please log in to access this feature.
      </div>
    ));
  }

  if (!isAdmin) {
    return fallback || (showMessage && (
      <div className="text-center p-4 text-red-500">
        Admin permissions required.
      </div>
    ));
  }

  return children;
};

export default AdminGuard;