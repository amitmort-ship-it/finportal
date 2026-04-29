import { useState, Suspense } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6">
      <h1>Admin Panel</h1>
    </div>
  );
}