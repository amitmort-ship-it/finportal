import { useState } from 'react';
import { Shield, Download, Upload, Loader2, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'ממתין לחתימה', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  signed: { label: 'הוחזר חתום', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  completed: { label: 'הושלם', color: 'bg-blue-50 text-blue-600 border-blue-200' },
};

export default function CollateralCard({ collateral, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const sc = statusConfig[collateral.status] || statusConfig.pending;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Collateral.update(collateral.id, {
      client_file_url: file_url,
      client_file_name: file.name,
      status: 'signed',
    });
    toast.success('המסמך החתום הועלה בהצלחה');
    setUploading(false);
    onUpdate?.();
  };

  return (
    <div className={`bg-card rounded-xl border overflow-hidden ${sc.color.includes('amber') ? 'border-amber-200' : sc.color.includes('emerald') ? 'border-emerald-200' : 'border-blue-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground">{collateral.title}</span>
        </div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${sc.color}`}>{sc.label}</span>
      </div>

      {/* Split body */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-border">
        {/* Right: document from office */}
        <div className="p-4">
          <div className="text-xs font-semibold text-primary mb-2">מסמך לחתימה</div>
          {collateral.description && (
            <p className="text-sm text-muted-foreground mb-2">{collateral.description}</p>
          )}
          {collateral.handler && (
            <p className="text-xs text-muted-foreground mb-3">
              מטפל: <span className="font-medium text-foreground">{collateral.handler}</span>
            </p>
          )}
          {collateral.notes && (
            <p className="text-xs text-muted-foreground mb-2">{collateral.notes}</p>
          )}
          {collateral.admin_file_url ? (
            <a href={collateral.admin_file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <Download className="w-4 h-4" />
              {collateral.admin_file_name || 'הורד מסמך לחתימה'}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">לא הועלה מסמך עדיין</span>
          )}
        </div>

        {/* Left: upload signed doc */}
        <div className="p-4">
          <div className="text-xs font-semibold text-emerald-600 mb-2">החזרת מסמך חתום</div>
          {collateral.client_file_url ? (
            <div className="space-y-2">
              <a href={collateral.client_file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:underline">
                <Download className="w-4 h-4" />
                {collateral.client_file_name || 'המסמך החתום'}
              </a>
              <div>
                <label className="flex items-center gap-2 mt-2 text-xs text-muted-foreground cursor-pointer hover:text-primary">
                  <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                  <Upload className="w-3.5 h-3.5" />
                  החלף מסמך
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all">
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              {uploading ? (
                <Loader2 className="w-7 h-7 text-emerald-500 animate-spin" />
              ) : (
                <Upload className="w-7 h-7 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground text-center">
                {uploading ? 'מעלה...' : 'לחץ להעלאת המסמך החתום'}
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}