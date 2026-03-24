import { useState } from 'react';
import { Upload, CheckCircle2, Clock, XCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'ממתין להעלאה', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  uploaded: { label: 'הועלה', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
  approved: { label: 'אושר', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function FileUploadCard({ request, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const config = statusConfig[request.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.FileRequest.update(request.id, {
      uploaded_file_url: file_url,
      uploaded_file_name: file.name,
      status: 'uploaded',
    });
    toast.success('הקובץ הועלה בהצלחה');
    setUploading(false);
    onUpdate?.();
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{request.title}</h3>
          {request.description && (
            <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {request.admin_notes && (
        <div className="bg-muted rounded-lg p-3 mb-3 text-sm text-muted-foreground">
          {request.admin_notes}
        </div>
      )}

      {request.uploaded_file_url ? (
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
          <FileText className="w-4 h-4 text-primary" />
          <a href={request.uploaded_file_url} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex-1">
            {request.uploaded_file_name || 'הורדת קובץ'}
          </a>
          {request.status === 'pending' || request.status === 'rejected' ? (
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              <span className="text-xs text-primary hover:underline">החלף קובץ</span>
            </label>
          ) : null}
        </div>
      ) : (
        <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? 'מעלה...' : 'לחץ להעלאת קובץ'}
          </span>
        </label>
      )}
    </div>
  );
}