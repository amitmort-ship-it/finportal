import { Package, FileText, Download } from 'lucide-react';

export default function PackageCard({ pkg }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{pkg.title}</h3>
          {pkg.description && (
            <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
          )}
          
          <div className="mt-3">
            <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
              pkg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {pkg.status === 'confirmed' ? '✓ אושר' : 'ממתין לאישור'}
            </span>
          </div>

          {pkg.notes && (
            <p className="text-sm text-muted-foreground mt-2">{pkg.notes}</p>
          )}

          {pkg.file_url && (
            <a href={pkg.file_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline">
              <Download className="w-3.5 h-3.5" />
              {pkg.file_name || 'הורד תמהיל'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}