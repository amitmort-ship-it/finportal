import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">לוח ניהול</h1>
        <p className="text-muted-foreground mt-1">ניהול לקוחות, מסמכים, אישורים ובטחונות</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-muted-foreground">לוח הניהול עומד לעדכון...</p>
      </div>
    </div>
  );
}