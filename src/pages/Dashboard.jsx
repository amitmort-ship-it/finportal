import { useAuth } from '@/lib/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold">שלום, {user?.full_name || 'לקוח'}</h1>
      <p className="text-muted-foreground">ברוך הבא לאיזור האישי שלך</p>
    </div>
  );
}