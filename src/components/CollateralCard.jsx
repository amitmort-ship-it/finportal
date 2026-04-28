import { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'חסר', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
  signed: { label: 'בטיפול', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
  completed: { label: 'הושלם', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

export default function CollateralCard({ collateral: initial, onUpdate }) {
  const [collateral, setCollateral] = useState(initial);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setCollateral(initial); }, [initial]);

  useEffect(() => {
    const unsub = base44.entities.Collateral.subscribe((event) => {
      if (event.type === 'update' && (event.id === collateral.id || event.data?.id === collateral.id) && event.data) {
        setCollateral(event.data);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [collateral.id]);

  const sc = statusConfig[collateral.status] || statusConfig.pending;

  // Merge legacy single file + new multi-files array
  const clientFiles = (() => {
    const files = Array.isArray(collateral.client_files) ? [...collateral.client_files] : [];
    // include legacy single file if not already in the array
    if (collateral.client_file_url && !files.find(f => f.file_url === collateral.client_file_url)) {
      files.unshift({ file_url: collateral.client_file_url, file_name: collateral.client_file_name || 'מסמך חתום' });
    }
    return files;
  })();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newFiles = [...clientFiles, { file_url, file_name: file.name }];
      await base44.entities.Collateral.update(collateral.id, {
        client_files: newFiles,
        status: 'signed',
      });
      toast.success('המסמך הועלה בהצלחה');
      onUpdate?.();
    } catch (err) {
      console.error('CollateralCard upload error:', err);
      toast.error('שגיאה בהעלאה: ' + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (fileUrl) => {
    try {
      const newFiles = clientFiles.filter(f => f.file_url !== fileUrl);
      await base44.entities.Collateral.update(collateral.id, {
        client_files: newFiles,
        client_file_url: newFiles.length === 0 ? null : collateral.client_file_url,
        client_file_name: newFiles.length === 0 ? null : collateral.client_file_name,
        status: newFiles.length === 0 ? 'pending' : 'signed',
      });
      toast.success('הקובץ הוסר');
      onUpdate?.();
    } catch (err) {
      console.error('CollateralCard remove error:', err);
      toast.error('שגיאה בהסרה: ' + (err?.message || err));
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 ${sc.border} p-4 space-y-3 shadow-sm`} dir="rtl">
      {/* Title & status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-foreground leading-snug">{collateral.title}</h3>
        <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </div>

      {collateral.description && (
        <p className="text-xs text-muted-foreground">{collateral.description}</p>
      )}
      {collateral.handler && (
        <p className="text-xs text-muted-foreground">מטפל: <span className="font-medium text-foreground">{collateral.handler}</span></p>
      )}

      {/* Admin doc */}
      {collateral.admin_file_url && (
        <a
          href={collateral.admin_file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          {collateral.admin_file_name || 'הורד מסמך לחתימה'}
        </a>
      )}

      {/* Client signed docs list */}
      {clientFiles.length > 0 && (
        <div className="space-y-1">
          {clientFiles.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-2 py-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline truncate flex-1">
                {f.file_name || `מסמך ${idx + 1}`}
              </a>
              {collateral.status !== 'completed' && (
                <Button size="icon" variant="ghost" onClick={() => handleRemove(f.file_url)} className="text-destructive h-5 w-5 shrink-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button — always visible unless completed */}
      {collateral.status !== 'completed' && (
        <label className="flex items-center gap-2 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          {uploading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">{uploading ? 'מעלה...' : clientFiles.length > 0 ? 'הוסף מסמך נוסף' : 'העלה מסמך חתום'}</span>
        </label>
      )}
    </div>
  );
}