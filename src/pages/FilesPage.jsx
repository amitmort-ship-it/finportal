import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import FileUploadCard from '../components/FileUploadCard';
import { FileText, Download, Inbox } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CATEGORIES = ['לווה 1', 'לווה 2', 'משותף'];
const CATEGORY_STYLES = {
  'לווה 1': { bg: 'bg-blue-50 border-blue-200', title: 'text-blue-600' },
  'לווה 2': { bg: 'bg-purple-50 border-purple-200', title: 'text-purple-600' },
  'משותף': { bg: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-600' },
};

function isAdminUploadedRequest(request) {
  const files = Array.isArray(request?.uploaded_files) ? request.uploaded_files : [];
  return files.length > 0 && files.every((file) => file?.uploaded_by_email === 'admin');
}

export default function FilesPage() {
  const { caseEmail } = useAuth();
  const { data: requests = [], isLoading: loading } = useQuery({
    queryKey: ['file-requests', caseEmail],
    queryFn: async () => {
      if (!caseEmail) return [];
      return base44.entities.FileRequest.filter({ client_email: caseEmail }, '-created_date');
    },
    enabled: !!caseEmail,
  });

  useEffect(() => {
    if (!caseEmail) return;
    const unsubscribe = base44.entities.FileRequest.subscribe(() => {});
    return unsubscribe;
  }, [caseEmail]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const adminUploadedRequests = requests.filter(isAdminUploadedRequest);
  const requiredRequests = requests.filter((request) => !isAdminUploadedRequest(request));

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
          <TabsTrigger value="office" className="gap-2">
            <FileText className="w-4 h-4" />
            מסמכים שהועלו בידי עמית
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

        <TabsContent value="office">
          {adminUploadedRequests.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">עדיין לא הועלו מסמכים עבורך</h3>
              <p className="text-sm text-muted-foreground mt-1">כאן יופיעו מסמכים שהמשרד העלה עבורך ישירות למערכת</p>
            </div>
          ) : (
            <div className="space-y-4">
              {adminUploadedRequests.map((request) => (
                <div key={request.id} className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{request.title}</h3>
                      {request.description ? (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{request.description}</p>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                      <Download className="w-3 h-3" />
                      הועלה עבורך
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(request.uploaded_files || []).map((file, idx) => (
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
