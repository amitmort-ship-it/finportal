import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = {
  'לווה 1': [
    'תלוש שכר 1',
    'תלוש שכר 2',
    'תלוש שכר 3',
    'עו"ש 3 חודשים אחרונים',
    'אישור ניהול חשבון בנק',
    'דוח יתרות בחשבון',
    'דוח הלוואות (אם יש)',
    'טופס 106 (אם מקבל בונוסים)',
  ],
  'לווה 2': [
    'תלוש שכר 1',
    'תלוש שכר 2',
    'תלוש שכר 3',
    'עו"ש 3 חודשים אחרונים',
    'אישור ניהול חשבון בנק',
    'דוח יתרות בחשבון',
    'דוח הלוואות (אם יש)',
    'טופס 106 (אם מקבל בונוסים)',
  ],
  'משותף': [
    'חוזה רכישה',
    'נסח טאבו',
  ],
};

const CATEGORY_COLORS = {
  'לווה 1': 'bg-blue-50 border-blue-200 text-blue-700',
  'לווה 2': 'bg-purple-50 border-purple-200 text-purple-700',
  'משותף': 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

export default function AdminDocumentRequest({ selectedClient }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(selectedClient || '');
  const [selectedDocs, setSelectedDocs] = useState({});
  const [customDocs, setCustomDocs] = useState({ 'לווה 1': '', 'לווה 2': '', 'משותף': '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const profiles = await base44.entities.ClientProfile.list();
      setUsers(profiles);
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedClient) setSelectedUser(selectedClient);
  }, [selectedClient]);

  const toggleDoc = (category, doc) => {
    const key = `${category}::${doc}`;
    setSelectedDocs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addCustomDoc = (category) => {
    const title = customDocs[category].trim();
    if (!title) return;
    const key = `${category}::${title}`;
    setSelectedDocs(prev => ({ ...prev, [key]: true }));
    setCustomDocs(prev => ({ ...prev, [category]: '' }));
  };

  const totalSelected = Object.values(selectedDocs).filter(Boolean).length;

  const handleSend = async () => {
    if (!selectedUser || totalSelected === 0) {
      toast.error('בחר לקוח ולפחות מסמך אחד');
      return;
    }

    setLoading(true);
    const toCreate = Object.entries(selectedDocs)
      .filter(([, checked]) => checked)
      .map(([key]) => {
        const [category, title] = key.split('::');
        return { client_email: selectedUser, title, category };
      });

    await Promise.all(toCreate.map(doc => base44.entities.FileRequest.create(doc)));
    toast.success(`נשלחו ${toCreate.length} בקשות מסמכים`);
    setSelectedDocs({});
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">בקשת מסמכים</h2>
      </div>

      <div className="mb-6">
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

      <div className="space-y-5">
        {Object.entries(CATEGORIES).map(([category, docs]) => (
          <div key={category} className={`rounded-xl border p-4 ${CATEGORY_COLORS[category]}`}>
            <h3 className="font-bold text-sm mb-3">{category}</h3>
            <div className="space-y-2">
              {docs.map(doc => {
                const key = `${category}::${doc}`;
                return (
                  <div key={doc} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={!!selectedDocs[key]}
                      onCheckedChange={() => toggleDoc(category, doc)}
                    />
                    <Label htmlFor={key} className="cursor-pointer font-normal text-sm">{doc}</Label>
                  </div>
                );
              })}

              {/* Custom docs added for this category */}
              {Object.entries(selectedDocs)
                .filter(([key, checked]) => checked && key.startsWith(`${category}::`) && !docs.includes(key.split('::')[1]))
                .map(([key]) => {
                  const title = key.split('::')[1];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={key}
                        checked={true}
                        onCheckedChange={() => toggleDoc(category, title)}
                      />
                      <Label htmlFor={key} className="cursor-pointer font-normal text-sm">{title}</Label>
                    </div>
                  );
                })}
            </div>

            {/* Add custom document */}
            <div className="flex gap-2 mt-3">
              <Input
                value={customDocs[category]}
                onChange={e => setCustomDocs(prev => ({ ...prev, [category]: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addCustomDoc(category)}
                placeholder="הוסף מסמך נוסף..."
                className="text-sm h-8 bg-white/70"
              />
              <Button size="sm" variant="outline" onClick={() => addCustomDoc(category)} className="h-8 px-2 bg-white/70">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={handleSend}
        disabled={loading || !selectedUser || totalSelected === 0}
        className="w-full gap-2 mt-6"
      >
        <Send className="w-4 h-4" />
        {loading ? 'שולח...' : `שלח ${totalSelected > 0 ? `(${totalSelected})` : ''} בקשות`}
      </Button>
    </div>
  );
}