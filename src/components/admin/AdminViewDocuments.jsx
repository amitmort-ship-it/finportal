import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download } from 'lucide-react';

export default function AdminViewDocuments({ selectedClient }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await base44.entities.FileRequest.list('-created_date');
      const filtered = selectedClient ? data.filter(r => r.client_email === selectedClient) : data;
      setRequests(filtered);
      setLoading(false);
    };
    load();
  }, [selectedClient]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">המסמכים שהועלו</h2>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין מסמכים שהועלו עדיין
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="font-semibold">{req.title}</div>
                  <div className="text-sm text-muted-foreground">{req.client_email}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                  req.status === 'uploaded' ? 'bg-blue-50 text-blue-600' :
                  req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                  req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {req.status === 'pending' ? 'ממתין' : req.status === 'uploaded' ? 'הועלה' : req.status === 'approved' ? 'אושר' : 'נדחה'}
                </span>
              </div>
              
              {req.uploaded_files && req.uploaded_files.length > 0 ? (
                <div className="space-y-2">
                  {req.uploaded_files.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary hover:underline truncate">{file.file_name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/20">
                  לא הועלו מסמכים עדיין
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}