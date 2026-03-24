import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PackageCard from '../components/PackageCard';
import { Package, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PackagePage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadPackages = async () => {
    const data = await base44.entities.SelectedPackage.filter({ client_email: user.email }, '-created_date');
    setPackages(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPackages();
  }, [user.email]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    // Create package entry
    await base44.entities.SelectedPackage.create({
      client_email: user.email,
      title: file.name.replace(/\.[^/.]+$/, ''),
      file_url,
      file_name: file.name,
      status: 'pending',
    });
    
    toast.success('התמהיל הועלה בהצלחה');
    setUploading(false);
    loadPackages();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">תמהיל נבחר</h1>
        <p className="text-muted-foreground mt-1">העלה את התמהיל המסוכם</p>
      </div>

      <div className="mb-6">
        <label className="flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <span className="text-center">
            <span className="block text-sm font-medium text-foreground">
              {uploading ? 'מעלה...' : 'לחץ להעלאת קובץ תמהיל'}
            </span>
            <span className="block text-xs text-muted-foreground mt-1">או גרור קובץ לכאן</span>
          </span>
        </label>
      </div>

      {packages.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">לא העלית תמהיל עדיין</h3>
          <p className="text-sm text-muted-foreground mt-1">העלה את התמהיל המסוכם דרך הכפתור למעלה</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}