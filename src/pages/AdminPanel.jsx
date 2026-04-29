import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      <p className="text-muted-foreground mt-4">Coming soon</p>
    </div>
  );
}