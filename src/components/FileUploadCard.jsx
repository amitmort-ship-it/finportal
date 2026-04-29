import { useState, useEffect } from 'react';
import { Upload, CheckCircle2, Clock, XCircle, FileText, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

const ADMIN_REVIEW_NOTES_MARKER = '\n\n[[ADMIN_REVIEW_NOTES]]\n';

function getInvokeError(result) {
  return (
    result?.error ||
    result?.data?.error ||
    result?.response?.data?.error ||
    null
  );
}

function splitDescriptionAndReviewNotes(request) {
  const legacyReviewNotes = String(request?.admin_review_notes || '').trim();
  const description = String(request?.description || '');

  if (legacyReviewNotes) {
    return {
      description: description.trim(),
      reviewNotes: legacyReviewNotes,
    };
  }

  if (!description.includes(ADMIN_REVIEW_NOTES_MARKER)) {
    return {
      description: description.trim(),
      reviewNotes: '',
    };
  }

  const [baseDescription, ...reviewParts] = description.split(ADMIN_REVIEW_NOTES_MARKER);

  return {
    description: baseDescription.trim(),
    reviewNotes: reviewParts.join(ADMIN_REVIEW_NOTES_MARKER).trim(),
  };
}

const statusConfig = {
  pending: {
    label: 'ממתין להעלאה',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  uploaded: {
    label: 'הועלה',
    icon: CheckCircle2,
    color: 'text-blue-600 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  approved: {
    label: 'אושר',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  rejected: {
    label: 'נדחה',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
};

export default function FileUploadCard({ request: initialRequest, onUpdate }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  // ניהול ה-request ב-State פנימי כדי לאפשר עדכון חי
  const [request, setRequest] = useState(initialRequest);

  // סנכרון אם ה-Props משתנים
  useEffect(() => {
    setRequest(initialRequest);
  }, [initialRequest]);

  // האזנה לשינויים במסד הנתונים בזמן אמת (Realtime)
  useEffect(() => {
    const unsubscribe = base44.entities.FileRequest.subscribe((event) => {
      // אם בוצע עדכון לרשומה הספציפית הזו
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
  const parsedContent = splitDescriptionAndReviewNotes(request);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. העלאת הקובץ הפיזי
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newFiles = [...uploadedFiles, {
        file_url,
        file_name: file.name,
        uploaded_by_email: user?.email || null,
        uploaded_by_name: user?.full_name || user?.email || null,
        uploaded_at: new Date().toISOString(),
      }];
      
      // 2. עדכון הרשומה ב-Database (ה-Subscription למעלה יתפוס את זה ויעדכן את ה-UI)
      const updatedDoc = await base44.entities.FileRequest.update(request.id, {
        uploaded_files: newFiles,
        status: 'uploaded',
      });

      // עדכון מקומי מהיר לגיבוי
      setRequest(updatedDoc);

      // 3. העלאה ל-Drive עם שגיאה גלויה אם משהו נכשל
      const driveRes = await base44.functions.invoke('uploadToDrive', {
        file_url,
        file_name: file.name,
        client_email: request.client_email,
        category: request.category,
        viewer_email: user?.email || null,
      });

      const invokeError = getInvokeError(driveRes);
      if (invokeError) {
        throw new Error(invokeError);
      }

      console.log('uploadToDrive result', driveRes?.data || driveRes);

      if (user?.role !== 'admin') {
        const notificationRes = await base44.functions.invoke('createAdminNotification', {
          event_type: 'file_upload',
          client_email: request.client_email,
          message: `${user?.full_name || user?.email || 'לקוח'} העלה/תה מסמך: ${file.name}`,
        });

        const notificationError = getInvokeError(notificationRes);
        if (notificationError) {
          throw new Error(notificationError);
        }

        console.log('createAdminNotification result', notificationRes?.data || notificationRes);
      }

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
      status: newStatus
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
          {parsedContent.description && (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{parsedContent.description}</p>
          )}
          {parsedContent.reviewNotes ? (
            <div className={`mt-2 rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
              request.status === 'rejected'
                ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                : 'bg-muted/50 text-muted-foreground'
            }`}>
              <span className="font-medium text-foreground">הערת המשרד:</span> {parsedContent.reviewNotes}
            </div>
          ) : null}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.color}`}>
          <StatusIcon className="w-3 h-3" />
          {config.label}
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2 mb-3">
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1">
                {file.file_name}
              </a>
              {(request.status === 'pending' || request.status === 'rejected' || request.status === 'uploaded') && (
                <Button size="icon" variant="ghost" onClick={() => handleDeleteFile(idx)} className="text-destructive h-6 w-6">
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
