import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('שם לא יכול להיות ריק');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateMe({ full_name: fullName });
      toast.success('השם עודכן בהצלחה');
    } catch (error) {
      toast.error(error.message || 'שגיאה בעדכון השם');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">פרופיל</h1>
        <p className="text-muted-foreground mt-1">ערוך את פרטי החשבון שלך</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-6">
          <User className="w-6 h-6 text-primary" />
        </div>

        <div className="space-y-4">
          <div>
            <Label>כתובת אימייל</Label>
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="mt-1"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">לא ניתן לשנות את כתובת המייל</p>
          </div>

          <div>
            <Label>שם מלא</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="הכנס שם"
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading || fullName === user?.full_name}
            className="w-full"
          >
            {loading ? 'שומר...' : 'שמור שינויים'}
          </Button>
        </div>
      </div>
    </div>
  );
}