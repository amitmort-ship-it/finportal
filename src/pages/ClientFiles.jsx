import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ClientFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return;
      const data = await base44.entities.FileRequest.list('-created_date');
      const userRequests = data.filter(r => r.client_email === user.email);
      const allFiles = [];
      userRequests.forEach(req => {
        if (req.uploaded_files && req.uploaded_files.length > 0) {
          req.uploaded_files.forEach(file => {
            allFiles.push({
              ...file,
              requestId: req.id,
              requestTitle: req.title,
            });
          });
        }
      });
      setFiles(allFiles);
      setLoading(false);
    };
    load();
  }, [user?.email]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.email) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create a new file request for this upload
      await base44.entities.FileRequest.create({
        client_email: user.email,
        title: file.name,
        uploaded_files: [{ file_url, file_name: file.name }],
        status: 'uploaded',
      });
      
      toast.success('הקובץ הועלה בהצלחה');
      
      // Reload files
      const data = await base44.entities.FileRequest.list('-created_date');
      const userRequests = data.filter(r => r.client_email === user.email);
      const allFiles = [];
      userRequests.forEach(req => {
        if (req.uploaded_files && req.uploaded_files.length > 0) {
          req.uploaded_files.forEach(f => {
            allFiles.push({
              ...f,
              requestId: req.id,
              requestTitle: req.title,
            });
          });
        }
      });
      setFiles(allFiles);
    } catch (error) {
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (requestId, fileIndex) => {
    try {
      const req = await base44.entities.FileRequest.get(requestId);
      const newFiles = req.uploaded_files.filter((_, idx) => idx !== fileIndex);
      
      if (newFiles.length === 0) {
        await base44.entities.FileRequest.delete(requestId);
      } else {
        await base44.entities.FileRequest.update(requestId, { uploaded_files: newFiles });
      }
      
      toast.success('הקובץ הוסר');
      setFiles(files.filter(f => !(f.requestId === requestId && f === files[files.findIndex(x => x.requestId === requestId && x.file_name === files.find(y => y.requestId === requestId && y.file_name === f.file_name).file_name)])));
    } catch (error) {
      toast.error('שגיאה בהסרת הקובץ');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">הקבצים שלי</h1>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <label className="flex flex-col items-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground text-center">
            {uploading ? 'מעלה...' : 'לחץ להעלאת קובץ'}
          </span>
        </label>
      </div>

      {files.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין לך קבצים מעולם
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file, idx) => (
            <div key={idx} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline block truncate"
                  >
                    {file.file_name}
                  </a>
                  <div className="text-xs text-muted-foreground">{file.requestTitle}</div>
                </div>
              </div>
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}