import { Package, FileText, Download, Image } from 'lucide-react';

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

          {pkg.screenshots?.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Image className="w-3.5 h-3.5" /> צילומי מסלולים וריביות
              </div>
              <div className="grid grid-cols-2 gap-2">
                {pkg.screenshots.map((sc, i) => (
                  <a key={i} href={sc.url} target="_blank" rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                    <img src={sc.url} alt={sc.name || `צילום ${i + 1}`} className="w-full h-32 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}