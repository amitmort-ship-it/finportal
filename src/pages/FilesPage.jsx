import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import FileUploadCard from '../components/FileUploadCard';
import { FileText, Download, Inbox, User, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ADMIN_REVIEW_NOTES_MARKER = '\n\n[[ADMIN_REVIEW_NOTES]]\n';

const CATEGORIES = ['לווה 1', 'לווה 2', 'משותף'];
const CATEGORY_STYLES = {
  'לווה 1': {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50',
    title: 'text-blue-600 dark:text-blue-300',
  },
  'לווה 2': {
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/25 dark:border-purple-900/50',
    title: 'text-purple-600 dark:text-purple-300',
  },
  'משותף': {
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/25 dark:border-emerald-900/50',
    title: 'text-emerald-600 dark:text-emerald-300',
  },
};

function getUploadedFiles(request) {
  return Array.isArray(request?.uploaded_files) ? request.uploaded_files : [];
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

function hasUploadedFiles(request) {
  return getUploadedFiles(request).length > 0;
}

function isAdminUploadedRequest(request) {
  const files = getUploadedFiles(request);

  if (request?.source === 'admin_upload') {
    return true;
  }

  return files.some((file) => (
    file?.uploaded_by_email === 'admin' ||
    file?.uploaded_by_name === 'הועלה על ידי המשרד'
  ));
}

function getUploaderBadge(request) {
  if (isAdminUploadedRequest(request)) {
    return {
      label: 'הועלה בידי עמית',
      className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300',
      icon: Briefcase,
    };
  }

  return {
    label: 'הועלה על ידך',
    className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300',
    icon: User,
  };
}

function getRequestStatusBadge(request) {
  if (request?.status === 'approved') {
    return {
      label: 'אושר על ידי המשרד',
      className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300',
    };
  }

  if (request?.status === 'rejected') {
    return {
      label: 'נדרש תיקון או מסמך חדש',
      className: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300',
    };
  }

  if (request?.status === 'uploaded') {
    return {
      label: 'התקבל וממתין לבדיקה',
      className: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300',
    };
  }

  return null;
}

export default function FilesPage() {
  const { caseEmail } = useAuth();
  const { data: requests = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['file-requests', caseEmail],
    queryFn: async () => {
      if (!caseEmail) return [];
      return base44.entities.FileRequest.filter({ client_email: caseEmail }, '-created_date');
    },
    enabled: !!caseEmail,
  });

  useEffect(() => {
    if (!caseEmail) return;
    const unsubscribe = base44.entities.FileRequest.subscribe(() => {
      refetch();
    });
    return unsubscribe;
  }, [caseEmail, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const uploadedRequests = requests.filter(hasUploadedFiles);
  const requiredRequests = requests.filter((request) => !hasUploadedFiles(request));

  const groupedRequired = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = requiredRequests.filter((r) => r.category === cat);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">מסמכים</h1>
      </div>

      <Tabs defaultValue="required" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-2 mb-6">
          <TabsTrigger value="required" className="gap-2">
            <Inbox className="w-4 h-4" />
            מסמכים נדרשים
          </TabsTrigger>
          <TabsTrigger value="uploaded" className="gap-2">
            <FileText className="w-4 h-4" />
            מסמכים שהועלו למערכת
          </TabsTrigger>
        </TabsList>

        <TabsContent value="required">
          {requiredRequests.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">אין מסמכים נדרשים כרגע</h3>
              <p className="text-sm text-muted-foreground mt-1">כאשר יהיו מסמכים להעלאה, הם יופיעו כאן</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CATEGORIES.map((cat) => (
                <div key={cat} className={`rounded-2xl border p-5 ${CATEGORY_STYLES[cat].bg}`}>
                  <h2 className={`font-bold text-base mb-4 text-center ${CATEGORY_STYLES[cat].title}`}>{cat}</h2>
                  {groupedRequired[cat]?.length > 0 ? (
                    <div className="space-y-3">
                      {groupedRequired[cat].map((request) => (
                        <FileUploadCard key={request.id} request={request} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-6">אין מסמכים בקטגוריה זו</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploaded">
          {uploadedRequests.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">עדיין לא הועלו מסמכים עבורך</h3>
              <p className="text-sm text-muted-foreground mt-1">כאן יופיעו כל המסמכים שכבר הועלו למערכת</p>
            </div>
          ) : (
            <div className="space-y-4">
              {uploadedRequests.map((request) => {
                const badge = getUploaderBadge(request);
                const BadgeIcon = badge.icon;
                const statusBadge = getRequestStatusBadge(request);
                const parsedContent = splitDescriptionAndReviewNotes(request);

                return (
                  <div key={request.id} className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{request.title}</h3>
                        {parsedContent.description ? (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{parsedContent.description}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                        {statusBadge ? (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {parsedContent.reviewNotes ? (
                      <div
                        className={`mb-4 rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                          request.status === 'rejected'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                            : 'bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <span className="font-medium text-foreground">הערת המשרד:</span> {parsedContent.reviewNotes}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {getUploadedFiles(request).map((file, idx) => (
                        <div key={`${request.id}-${idx}`} className="flex items-center gap-2 bg-muted/40 rounded-lg p-3">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex-1 truncate"
                          >
                            {file.file_name}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
