import { Shield, FileText, Download } from 'lucide-react';

export default function CollateralCard({ collateral }) {
  const isActive = collateral.status === 'active';

  return (
    <div className={`bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-300 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-50' : 'bg-muted'}`}>
          <Shield className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{collateral.title}</h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
            }`}>
              {isActive ? 'פעיל' : 'שוחרר'}
            </span>
          </div>

          {collateral.type && (
            <p className="text-sm text-muted-foreground mt-0.5">סוג: {collateral.type}</p>
          )}

          {collateral.notes && (
            <p className="text-sm text-muted-foreground mt-2">{collateral.notes}</p>
          )}

          {collateral.file_url && (
            <a href={collateral.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline">
              <Download className="w-3.5 h-3.5" />
              {collateral.file_name || 'הורד מסמך'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}