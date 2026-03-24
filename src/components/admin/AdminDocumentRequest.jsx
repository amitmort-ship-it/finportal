import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TEMPLATES = [
  'תעודת זהות + ספח פתוח',
  'תדפיסי עובר ושב 3 חודשים',
  'אישור ניהול חשבון',
  'דוח ריכוז הלוואות',
  'דוח ריכוז יתרות',
  'שומת מס שנתיים אחרונות',
  'אישור הכנסות',
  'תלושי שכר 3 חודשים אחרונים',
  'דוח 106',
  'דוחות מבוקרים שנתיים אחרונות',
  'חוזה רכישה',
  'נסח טאבו',
  'חוזה שכירות',
  'אישור הכנסות נוספות',
];

export default function AdminDocumentRequest({ selectedClient }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(selectedClient || '');
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const userList = await base44.entities.User.list();
      setUsers(userList.filter(u => u.role !== 'admin'));
    };
    load();
  }, []);

  const handleDocToggle = (doc) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(doc)) {
      newSet.delete(doc);
    } else {
      newSet.add(doc);
    }
    setSelectedDocs(newSet);
  };

  const handleSendRequests = async () => {
    if (!selectedUser || selectedDocs.size === 0) {
      toast.error('בחר לקוח ולפחות מסמך אחד');
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedDocs).map(docTitle =>
          base44.entities.FileRequest.create({
            client_email: selectedUser,
            title: docTitle,
          })
        )
      );
      toast.success(`שלחנו ${selectedDocs.size} בקשות מסמכים`);
      setSelectedDocs(new Set());
    } catch (error) {
      toast.error(error.message || 'שגיאה בשליחת הבקשות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">בקשת מסמכים</h2>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="mb-2 block">בחר לקוח</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="בחר לקוח" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.email}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-3 block">בחר מסמכים</Label>
          <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded-lg p-4">
            {DOCUMENT_TEMPLATES.map(doc => (
              <div key={doc} className="flex items-center gap-2">
                <Checkbox
                  id={doc}
                  checked={selectedDocs.has(doc)}
                  onCheckedChange={() => handleDocToggle(doc)}
                />
                <Label htmlFor={doc} className="cursor-pointer font-normal">{doc}</Label>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            נבחרו {selectedDocs.size} מסמכים
          </div>
        </div>

        <Button
          onClick={handleSendRequests}
          disabled={loading || !selectedUser || selectedDocs.size === 0}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          {loading ? 'שולח...' : 'שלח בקשות'}
        </Button>
      </div>
    </div>
  );
}