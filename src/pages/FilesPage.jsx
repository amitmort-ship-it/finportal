import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { FileUp, Loader2, Download, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function FilesPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await base44.entities.FileRequest.filter(
          { client_email: user?.email },
          '-created_date',
        );
        setRequests(data);
      } catch (error) {
        console.error('Error loading file requests:', error);
        toast.error('שגיאה בטעינת בקשות המסמכים');
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      loadRequests();
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;

    const unsubscribe = base44.entities.FileRequest.subscribe((event) => {
      if (event.data?.client_email === user?.email) {
        if (event.type === 'delete') {
          setRequests((prev) => prev.filter((request) => request.id !== event.id));
        } else {
          setRequests((prev) => {
            const existing = prev.findIndex((request) => request.id === event.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = event.data;
              return updated;
            }
            return [event.data, ...prev];
          });
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.email]);

  const handleFileUpload = async (requestId, files) => {
    if (!files.length) return;

    setUploading((prev) => ({ ...prev, [requestId]: true }));

    try {
      const uploadedFiles = await Promise.all(
        Array.from(files).map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return {
            file_url,
            file_name: file.name,
          };
        }),
      );

      const request = requests.find((item) => item.id === requestId);
      const currentFiles = request?.uploaded_files || [];
      const allFiles = [...currentFiles, ...uploadedFiles];

      await base44.entities.FileRequest.update(requestId, {
        uploaded_files: allFiles,
        status: 'uploaded',
      });

      toast.success(`${files.length} קובץ/קבצים הועלו בהצלחה`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('שגיאה בהעלאת קובץ');
    } finally {
      setUploading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">המסמכים שלך</h1>
        <p className="text-muted-foreground mt-1">העלה מסמכים דרושים לתיק שלך</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">אין בקשות מסמכים כרגע</h2>
          <p className="text-muted-foreground mt-2">כל המסמכים הדרושים הועלו וחוקיים</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-card rounded-xl border border-border p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{request.title}</h3>
                  {request.description ? (
                    <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-2">
                    קטגוריה: {request.category || 'כללי'}
                  </p>
                </div>

                <div className="text-right">
                  {request.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3" />
                      ממתין
                    </span>
                  ) : null}

                  {request.status === 'uploaded' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      <FileUp className="w-3 h-3" />
                      בדיקה
                    </span>
                  ) : null}

                  {request.status === 'approved' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      אושר
                    </span>
                  ) : null}

                  {request.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                      <AlertCircle className="w-3 h-3" />
                      נדרשת תיקון
                    </span>
                  ) : null}
                </div>
              </div>

              {request.admin_notes ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 p-3">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    הערה מהמשרד:
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-300">{request.admin_notes}</p>
                </div>
              ) : null}

              {request.uploaded_files && request.uploaded_files.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">קבצים שהועלו:</p>
                  <div className="space-y-1">
                    {request.uploaded_files.map((file, index) => (
                      <a
                        key={index}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted text-sm text-primary hover:underline transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {file.file_name}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {request.status !== 'approved' ? (
                <div>
                  <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => handleFileUpload(request.id, event.target.files)}
                      disabled={uploading[request.id]}
                    />
                    {uploading[request.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-primary font-medium">מעלה...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">בחר קבצים</p>
                          <p className="text-xs text-muted-foreground">או גרור קבצים לכאן</p>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}