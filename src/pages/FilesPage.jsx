import { useAuth } from '@/lib/AuthContext';

export default function FilesPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Documents</h1>
      <p className="text-muted-foreground mt-4">Manage your files</p>
    </div>
  );
}