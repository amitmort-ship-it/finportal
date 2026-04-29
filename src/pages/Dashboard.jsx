import { useAuth } from '@/lib/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-4">Welcome {user?.full_name || 'User'}!</p>
    </div>
  );
}