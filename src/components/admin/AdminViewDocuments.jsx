import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Download, Upload, Loader2, Plus, FolderOpen, CheckCircle2, XCircle, Save, Send } from 'lucide-react';
import AdminDocumentRequest from './AdminDocumentRequest';
import AdminDownloadableDocs from './AdminDownloadableDocs';
import AdminServiceAgreement from './AdminServiceAgreement';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
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

function mergeDescriptionAndReviewNotes(description, reviewNotes) {
  const cleanDescription = String(description || '').trim();
  const cleanReviewNotes = String(reviewNotes || '').trim();

  if (!cleanReviewNotes) {
    return cleanDescription;
  }

  if (!cleanDescription) {
    return `[[ADMIN_REVIEW_NOTES]]\n${cleanReviewNotes}`;
  }

  return `${cleanDescription}${ADMIN_REVIEW_NOTES_MARKER}${cleanReviewNotes}`;
}

export default function AdminViewDocuments({ selectedClient }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [open, setOpen] = useState(false);
  const [requestDocsOpen, setRequestDocsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState({});
  const [editingTitles, setEditingTitles] = useState({});
  const [form, setForm] = useState({
    client_email: '',
    title: '',
    description: '',
    category: '',
    files: [],
  });

  const load = async () => {
    setLoading(true);

    try {
      const normalizedSelectedClient = normalizeEmail(selectedClient);

      const [data, clientRes, driveFolders] = await Promise.all([
        base44.entities.FileRequest.filter({}, '-created_date'),
        base44.functions.invoke('getAllClients', {}),
        normalizedSelectedClient
          ? base44.entities.DriveFolder.filter({ client_email: normalizedSelectedClient })
          : Promise.resolve([]),
      ]);

      const filtered = selectedClient ? data.filter((r) => r.client_email === selectedClient) : data;
      const normalizedRequests = filtered.map((request) => ({
        ...request,
        uploaded_files: Array.isArray(request?.uploaded_files) ? request.uploaded_files : [],
        status: request?.status || 'pending',
      }));
      const driveFolder = Array.isArray(driveFolders) ? driveFolders[0] : null;

      setRequests(normalizedRequests);
      setReviewNotes(
        Object.fromEntries(
          normalizedRequests.map((request) => [request.id, splitDescriptionAndReviewNotes(request).reviewNotes]),
        ),
      );
      setUsers(clientRes.data?.profiles || []);
      setDriveFolderUrl(
        driveFolder?.folder_id
          ? `https://drive.google.com/drive/folders/${driveFolder.folder_id}`
          : '',
      );
    } catch (error) {
      console.error(error);
      toast.error('שגיאה בטעינת המסמכים');
    } finally {
      setLoading(false);
    }
  };

  const applyRequestUpdateLocally = (updatedRequest) => {
    setRequests((prev) => prev.map((request) => (
      request.id === updatedRequest.id ? { ...request, ...updatedRequest } : request
    )));

    const parsedContent = splitDescriptionAndReviewNotes(updatedRequest);
    setReviewNotes((prev) => ({
      ...prev,
      [updatedRequest.id]: parsedContent.reviewNotes,
    }));
  };

  useEffect(() => {
    load();
  }, [selectedClient]);

  useEffect(() => {
    if (selectedClient) {
      setForm((prev) => ({ ...prev, client_email: selectedClient }));
    }
  }, [selectedClient]);

  const getDefaultTitle = () => {
    if (!form.files.length) return '';
    if (form.files.length === 1) return form.files[0].name;
    return `מסמכים שהועלו ידנית (${form.files.length})`;
  };

  const handleManualUpload = async () => {
    if (!form.client_email || !form.files.length) {
      toast.error('בחר לקוח ובחר לפחות קובץ אחד');
      return;
    }

    setUploading(true);

    try {
      const resolvedTitle = form.title.trim() || getDefaultTitle();
      const driveResults = [];

      const uploadedFiles = await Promise.all(
        form.files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });

          const driveRes = await base44.functions.invoke('uploadToDrive', {
            file_url,
            file_name: file.name,
            client_email: form.client_email,
            category: form.category || resolvedTitle,
            viewer_email: user?.email || null,
          });

          const invokeError = getInvokeError(driveRes);
          if (invokeError) {
            throw new Error(invokeError);
          }

          const drivePayload = driveRes?.data || driveRes;
          driveResults.push(drivePayload);

          return {
            file_url,
            file_name: file.name,
            uploaded_by_email: 'admin',
            uploaded_by_name: 'הועלה על ידי המשרד',
            uploaded_at: new Date().toISOString(),
          };
        }),
      );

      await base44.entities.FileRequest.create({
        client_email: form.client_email,
        title: resolvedTitle,
        description: form.description,
        category: form.category || null,
        source: 'admin_upload',
        status: 'uploaded',
        uploaded_files: uploadedFiles,
      });

      const firstDriveResult = driveResults[0];
      if (firstDriveResult?.folder_url) {
        setDriveFolderUrl(firstDriveResult.folder_url);
      }

      toast.success('המסמכים הועלו למערכת בשם הלקוח');
      setForm({
        client_email: selectedClient || '',
        title: '',
        description: '',
        category: '',
        files: [],
      });
      setOpen(false);
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'שגיאה בהעלאת המסמך');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDriveFolder = () => {
    if (!driveFolderUrl) {
      toast.error('עדיין לא קיימת תיקיית דרייב ללקוח הזה');
      return;
    }

    window.open(driveFolderUrl, '_blank', 'noopener,noreferrer');
  };

  const handleStatusUpdate = async (id, status) => {
    const currentRequest = requests.find((request) => request.id === id);
    const parsedContent = splitDescriptionAndReviewNotes(currentRequest);

    const updatedRequest = await base44.entities.FileRequest.update(id, {
      status,
      description: mergeDescriptionAndReviewNotes(parsedContent.description, reviewNotes[id] || ''),
    });

    applyRequestUpdateLocally(updatedRequest);
    toast.success('סטטוס המסמך עודכן');
  };

  const handleSaveTitle = async (id) => {
    const newTitle = editingTitles[id];
    if (!newTitle?.trim()) return;
    await base44.entities.FileRequest.update(id, { title: newTitle.trim() });
    applyRequestUpdateLocally({ id, title: newTitle.trim() });
    toast.success('השם עודכן');
  };

  const handleSaveNotes = async (id) => {
    const currentRequest = requests.find((request) => request.id === id);
    const parsedContent = splitDescriptionAndReviewNotes(currentRequest);

    const updatedRequest = await base44.entities.FileRequest.update(id, {
      description: mergeDescriptionAndReviewNotes(parsedContent.description, reviewNotes[id] || ''),
    });

    applyRequestUpdateLocally(updatedRequest);
    toast.success('ההערה נשמרה');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const CATEGORIES = ['לווה 1', 'לווה 2', 'משותף'];
  const CATEGORY_STYLES = {
    'לווה 1': { color: 'border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/10', headerColor: 'text-blue-700 dark:text-blue-300', badgeBg: 'bg-blue-100 text-blue-700' },
    'לווה 2': { color: 'border-purple-200 bg-purple-50/40 dark:border-purple-900/40 dark:bg-purple-950/10', headerColor: 'text-purple-700 dark:text-purple-300', badgeBg: 'bg-purple-100 text-purple-700' },
    'משותף': { color: 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10', headerColor: 'text-emerald-700 dark:text-emerald-300', badgeBg: 'bg-emerald-100 text-emerald-700' },
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = requests.filter(r => r.category === cat);
    return acc;
  }, {});
  const uncategorized = requests.filter(r => !r.category);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">בקשות ומסמכים</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleOpenDriveFolder}
            disabled={!selectedClient}
          >
            <FolderOpen className="w-4 h-4" />
            פתח תיקיית דרייב
          </Button>

          <Dialog open={requestDocsOpen} onOpenChange={setRequestDocsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Send className="w-4 h-4" />
                בקש מסמכים
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>בקשת מסמכים</DialogTitle>
              </DialogHeader>
              <AdminDocumentRequest
                selectedClient={selectedClient}
                onClientChange={() => {}}
                onSent={async () => {
                  setRequestDocsOpen(false);
                  await load();
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                העלה בשם הלקוח
              </Button>
            </DialogTrigger>

            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>העלאת מסמך בשם הלקוח</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                <div>
                  <Label>לקוח</Label>
                  <Select value={form.client_email} onValueChange={(value) => setForm((prev) => ({ ...prev, client_email: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((userItem) => (
                        <SelectItem key={userItem.id} value={userItem.email}>
                          {userItem.full_name || userItem.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>שם המסמך</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="למשל: תלושי שכר"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>קטגוריה</Label>
                  <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="בחר קטגוריה" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>הערות</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="הערות פנימיות או תיאור למסמך"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>קבצים</Label>
                  <label className="flex items-center gap-2 mt-1 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-all">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setForm((prev) => ({ ...prev, files: Array.from(e.target.files || []) }))}
                      disabled={uploading}
                    />
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">
                      {form.files.length === 0
                        ? 'בחר קובץ אחד או יותר'
                        : form.files.length === 1
                          ? form.files[0].name
                          : `נבחרו ${form.files.length} קבצים`}
                    </span>
                  </label>

                  {form.files.length > 1 ? (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {form.files.map((file) => (
                        <div key={`${file.name}-${file.size}`}>{file.name}</div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <Button
                  type="button"
                  onClick={handleManualUpload}
                  disabled={uploading || !form.client_email || !form.files.length}
                  className="w-full gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    'העלה מסמכים'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AdminServiceAgreement selectedClient={selectedClient} />
      <AdminDownloadableDocs selectedClient={selectedClient} />

      {requests.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
          אין בקשות מסמכים
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat} className={`rounded-xl border ${CATEGORY_STYLES[cat].color} flex flex-col`}>
              <div className={`px-4 py-3 rounded-t-xl font-bold text-sm ${CATEGORY_STYLES[cat].headerColor} border-b border-current/10 flex items-center justify-between`}>
                <span>{cat}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLES[cat].badgeBg}`}>{grouped[cat]?.length || 0}</span>
              </div>
              <div className="p-3 space-y-3 flex-1">
                {grouped[cat]?.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">אין בקשות בקטגוריה זו</div>
                ) : grouped[cat]?.map((req) => {
                  const parsedContent = splitDescriptionAndReviewNotes(req);
                  return (
                    <div key={req.id} className="bg-white dark:bg-card rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        {editingTitles[req.id] !== undefined ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingTitles[req.id]}
                              onChange={(e) => setEditingTitles((prev) => ({ ...prev, [req.id]: e.target.value }))}
                              className="h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(req.id);
                                if (e.key === 'Escape') setEditingTitles((prev) => { const n = {...prev}; delete n[req.id]; return n; });
                              }}
                              autoFocus
                            />
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-1 text-xs" onClick={() => handleSaveTitle(req.id)}><Save className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <h3 className="font-medium text-sm leading-snug cursor-pointer hover:text-primary" onClick={() => setEditingTitles((prev) => ({ ...prev, [req.id]: req.title }))}>{req.title}</h3>
                        )}
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                          req.status === 'uploaded' ? 'bg-blue-50 text-blue-600' :
                          req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                          req.status === 'rejected' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {req.status === 'pending' ? 'ממתין' :
                           req.status === 'uploaded' ? 'בדיקה' :
                           req.status === 'approved' ? 'אושר' :
                           'תיקון'}
                        </span>
                      </div>


                      <div className="text-xs text-muted-foreground">{req.client_email}</div>

                      {req.uploaded_files && req.uploaded_files.length > 0 ? (
                        <div className="space-y-1">
                          {req.uploaded_files.map((file, idx) => (
                            <a
                              key={idx}
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

                      <div className="space-y-2 pt-2 border-t border-border">
                        <Label htmlFor={`admin-view-note-${req.id}`} className="text-xs text-muted-foreground">
                          הערה
                        </Label>
                        <Textarea
                          id={`admin-view-note-${req.id}`}
                          value={reviewNotes[req.id] || ''}
                          onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="הערה..."
                          className="min-h-16 text-xs"
                        />

                        <div className="flex flex-col gap-1.5">
                          <Button type="button" size="sm" variant="outline" onClick={() => handleSaveNotes(req.id)} className="gap-2 w-full text-xs h-8">
                            <Save className="w-3 h-3" />
                            שמור
                          </Button>

                          {req.status === 'uploaded' || req.status === 'rejected' ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleStatusUpdate(req.id, 'approved')}
                              className="gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              אשר
                            </Button>
                          ) : null}

                          {req.status === 'uploaded' || req.status === 'approved' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusUpdate(req.id, 'rejected')}
                              className="gap-2 w-full text-xs h-8"
                            >
                              <XCircle className="w-3 h-3" />
                              דחה
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}