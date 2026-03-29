import { useState, useEffect } from 'react';
import { Upload, CheckCircle2, Clock, XCircle, FileText, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const statusConfig = {
  pending: { label: 'ממתין להעלאה', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  uploaded: { label: 'הועלה', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
  approved: { label: 'אושר', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  rejected: { label: 'נדחה', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function FileUploadCard({ request: initialRequest, onUpdate }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [request, setRequest] = useState(initialRequest);

  useEffect(() => {
    setRequest(initialRequest);
  }, [initialRequest]);

  useEffect(() => {
    const unsubscribe = base44.entities.FileRequest.subscribe((event) => {
      if (event.type === 'update' && event.data.id === request.id) {
        setRequest(event.data);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [request.id]);

  const config = statusConfig[request.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  const uploadedFiles = request.uploaded_files || [];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const newFiles = [
        ...uploadedFiles,
        {
          file_url,
          file_name: file.name,
          uploaded_by_email: user?.email || null,
          uploaded_by_name: user?.full_name || user?.email || null,
          uploaded_at: new Date().toISOString(),
        },
      ];

      const updatedDoc = await base44.entities.FileRequest.update(request.id, {
        uploaded_files: newFiles,
        status: 'uploaded',
      });

      setRequest(updatedDoc);

      base44.functions.invoke('uploadToDrive', {
        file_url,
        file_name: file.name,
        client_email: request.client_email,
        category: request.category,
      }).catch((err) => console.error('Drive upload failed:', err));

      toast.success('הקובץ הועלה בהצלחה');
      onUpdate?.();
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהעלאה');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newStatus = newFiles.length === 0 ? 'pending' : request.status;

    const updatedDoc = await base44.entities.FileRequest.update(request.id, {
      uploaded_files: newFiles,
      status: newStatus,
    });

    setRequest(updatedDoc);
    toast.success('הקובץ הוסר');
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

      {uploadedFiles.length > 0 && (
        <div className="space-y-2 mb-3">
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                {file.file_name}
              </a>
              {(request.status === 'pending' || request.status === 'rejected' || request.status === 'uploaded') && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteFile(idx)}
                  className="text-destructive h-6 w-6"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {(request.status === 'pending' || request.status === 'rejected') && (
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
