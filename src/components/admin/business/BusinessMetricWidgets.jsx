// רכיבי תצוגה קטנים שחולצו מ-AdminBusiness.jsx: כרטיס KPI ומד-מדידה (gauge).
import { fmt } from './businessUtils';

export function KpiCard({ icon, label, value, sub, gradient }) {
  return (
    <div className={`rounded-2xl border border-border shadow-sm p-4 space-y-1 ${gradient}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}<span>{label}</span></div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground leading-tight">{sub}</p>}
    </div>
  );
}

export function GaugeBar({ value, max, color, label, sublabel, valueLabel }) {
  const pct = Math.min(100, Math.max(0, ((value || 0) / (max || 1)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-semibold text-foreground">{valueLabel || fmt(value)}</span>
      </div>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-left">{Math.round(pct)}%</p>
    </div>
  );
}
