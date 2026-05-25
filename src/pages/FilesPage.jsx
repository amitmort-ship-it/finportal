import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { FileUp, Loader2, Download, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import ClientDownloadableDocs from '@/components/ClientDownloadableDocs';
import ClientServiceAgreement from '@/components/ClientServiceAgreement';
import { toast } from 'sonner';

export default function FilesPage() {
  const { user, caseEmail } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const res = await base44.functions.invoke('getCaseData', { case_email: caseEmail, entity: 'FileRequest' });
        setRequests(res.data.data || []);
      } catch (error) {
        console.error('Error loading file requests:', error);
        toast.error('שגיאה בטעינת בקשות המסמכים');
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    if (caseEmail) {
      loadRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [caseEmail]);

  useEffect(() => {
    if (!caseEmail) return;

    const unsubscribe = base44.entities.FileRequest.subscribe((event) => {
      if (event.data?.client_email === caseEmail) {
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
  }, [caseEmail]);

  const handleFileUpload = async (requestId, files) => {
    if (!files.length) return;

    setUploading((prev) => ({ ...prev, [requestId]: true }));

    try {
      const request = requests.find((item) => item.id === requestId);

      const uploadedFiles = await Promise.all(
        Array.from(files).map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });

          // sync to Google Drive in the background (don't block on errors)
          base44.functions.invoke('uploadToDrive', {
            file_url,
            file_name: file.name,
            client_email: user.email,
            category: request?.category || request?.title || 'כללי',
            viewer_email: null,
          }).catch((err) => console.error('Drive sync error:', err));

          return {
            file_url,
            file_name: file.name,
            uploaded_by_email: user.email,
            uploaded_by_name: user.full_name || user.email,
            uploaded_at: new Date().toISOString(),
          };
        }),
      );

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

      <ClientServiceAgreement clientEmail={caseEmail} />
      <ClientDownloadableDocs clientEmail={caseEmail} />

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-foreground">אין בקשות מסמכים כרגע</h2>
          <p className="text-muted-foreground mt-2">כל המסמכים הדרושים הועלו וחוקיים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {[
            { key: 'לווה 1', label: 'לווה 1', color: 'border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/10', headerColor: 'text-blue-700 dark:text-blue-300', badgeBg: 'bg-blue-100 text-blue-700' },
            { key: 'לווה 2', label: 'לווה 2', color: 'border-purple-200 bg-purple-50/40 dark:border-purple-900/40 dark:bg-purple-950/10', headerColor: 'text-purple-700 dark:text-purple-300', badgeBg: 'bg-purple-100 text-purple-700' },
            { key: 'משותף', label: 'משותף', color: 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10', headerColor: 'text-emerald-700 dark:text-emerald-300', badgeBg: 'bg-emerald-100 text-emerald-700' },
          ].map(({ key, label, color, headerColor, badgeBg }) => {
            const colRequests = requests.filter((r) => r.category === key);
            return (
              <div key={key} className={`rounded-xl border ${color} flex flex-col`}>
                <div className={`px-4 py-3 rounded-t-xl font-bold text-sm ${headerColor} border-b border-current/10 flex items-center justify-between`}>
                  <span>{label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeBg}`}>{colRequests.length}</span>
                </div>
                <div className="p-3 space-y-3">
                  {colRequests.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">אין בקשות בקטגוריה זו</div>
                  ) : colRequests.map((request) => (
                    <div key={request.id} className="bg-white dark:bg-card rounded-lg border border-border p-3 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm leading-snug">{request.title}</h3>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
                          request.status === 'pending' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                          request.status === 'uploaded' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                          request.status === 'approved' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                          'text-red-600 bg-red-50 border-red-200'
                        }`}>
                          {request.status === 'pending' ? <><Clock className="w-3 h-3" />ממתין</> :
                           request.status === 'uploaded' ? <><FileUp className="w-3 h-3" />בדיקה</> :
                           request.status === 'approved' ? <><CheckCircle2 className="w-3 h-3" />אושר</> :
                           <><AlertCircle className="w-3 h-3" />תיקון</>}
                        </span>
                      </div>

                      {request.admin_notes ? (
                        <div className="rounded bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 p-2 text-xs text-amber-800 dark:text-amber-300">
                          <span className="font-semibold">הערה: </span>{request.admin_notes}
                        </div>
                      ) : null}

                      {request.uploaded_files && request.uploaded_files.length > 0 ? (
                        <div className="space-y-1">
                          {request.uploaded_files.map((file, index) => (
                            <a
                              key={index}
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50 hover:bg-muted text-xs text-primary hover:underline transition-colors"
                            >
                              <Download className="w-3 h-3 shrink-0" />
                              <span className="truncate">{file.file_name}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}

                      {request.status !== 'approved' ? (
                        <label className="flex items-center gap-2 border border-dashed border-border rounded-lg p-2.5 cursor-pointer hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => handleFileUpload(request.id, event.target.files)}
                            disabled={uploading[request.id]}
                          />
                          {uploading[request.id] ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /><span className="text-xs text-primary font-medium">מעלה...</span></>
                          ) : (
                            <><FileUp className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">העלה קובץ</span></>
                          )}
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}