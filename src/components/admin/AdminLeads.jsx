import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Users2, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { STATUSES, selectClass, calcLTV, calcTotalIncome, calcTotalCommitments, fmt } from '@/components/leadomat/leadomatConfig';
import LeadomatForm from '@/components/leadomat/LeadomatForm';
import LeadomatDetail from '@/components/leadomat/LeadomatDetail';
import PricingStrategyCard from '@/components/leadomat/PricingStrategyCard';
import PipelineStepper, { PipelineBadge, PIPELINE_STAGES } from '@/components/leadomat/PipelineStepper';
import FollowUpManager, { FollowupBadge } from '@/components/leadomat/FollowUpManager';

const STATUS_COLORS = {
  'חדש': 'bg-blue-100 text-blue-700',
  'בטיפול': 'bg-amber-100 text-amber-700',
  'מוכשר': 'bg-emerald-100 text-emerald-700',
  'לא מוכשר': 'bg-red-100 text-red-700',
  'נסגר': 'bg-purple-100 text-purple-700',
};

function cleanNumber(val) {
  if (val === '' || val == null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Leadomat.list('-created_date', 200);
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      toast.error('שגיאה בטעינת הלידים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (rawData) => {
    setSaving(true);
    try {
      const payload = { ...rawData };
      // Clean deal numbers
      if (payload.deal) {
        const dealFields = ['purchase_cost', 'appraisal_value', 'representative_value', 'requested_mortgage', 'equity', 'additional_payments', 'equity_completion_loan'];
        const cleanDeal = { ...payload.deal };
        dealFields.forEach(f => { cleanDeal[f] = cleanNumber(cleanDeal[f]); });
        payload.deal = cleanDeal;
      }
      // Clean borrower incomes & children count
      ['borrower1', 'borrower2'].forEach(b => {
        if (payload[b]?.incomes) {
          payload[b].incomes = payload[b].incomes.map(inc => ({
            ...inc,
            net_amount: cleanNumber(inc.net_amount),
            gross_amount: cleanNumber(inc.gross_amount),
          }));
        }
        if (payload[b]) {
          payload[b].children_under_18 = Number(payload[b].children_under_18) || 0;
        }
      });
      // Clean commitments
      if (payload.commitments) {
        payload.commitments = payload.commitments.map(c => ({
          ...c,
          current_balance: cleanNumber(c.current_balance),
          monthly_payment: cleanNumber(c.monthly_payment),
        }));
      }
      // Clean additional numeric fields
      ['current_rent', 'requested_monthly_payment', 'monthly_savings_amount'].forEach(f => {
        payload[f] = cleanNumber(payload[f]);
      });

      if (editLead) {
        await base44.entities.Leadomat.update(editLead.id, payload);
        toast.success('הליד עודכן');
      } else {
        await base44.entities.Leadomat.create(payload);
        toast.success('הליד נוסף בהצלחה');
      }
      setShowForm(false);
      setEditLead(null);
      await load();
    } catch {
      toast.error('שגיאה בשמירת הליד');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הליד?')) return;
    try {
      await base44.entities.Leadomat.delete(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('הליד נמחק');
    } catch {
      toast.error('שגיאה במחיקת הליד');
    }
  };

  const handleEdit = (lead) => {
    setEditLead(lead);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditLead(null);
    setShowForm(true);
  };

  const handleStageChange = async (lead, newStage) => {
    setUpdatingStage(true);
    try {
      await base44.entities.Leadomat.update(lead.id, { pipeline_stage: newStage });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pipeline_stage: newStage } : l));
      setViewLead(prev => prev && prev.id === lead.id ? { ...prev, pipeline_stage: newStage } : prev);
      toast.success(`עבר לשלב: ${newStage}`);
    } catch {
      toast.error('שגיאה בעדכון השלב');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleFollowupUpdate = async (lead, patch) => {
    setUpdatingStage(true);
    try {
      await base44.entities.Leadomat.update(lead.id, patch);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...patch } : l));
      setViewLead(prev => prev && prev.id === lead.id ? { ...prev, ...patch } : prev);
      toast.success('תזכורת עודכנה');
    } catch {
      toast.error('שגיאה בעדכון התזכורת');
    } finally {
      setUpdatingStage(false);
    }
  };

  const filtered = leads.filter(l => {
    const matchesSearch = !search || (l.lead_name || '').includes(search) || (l.phone || '').includes(search);
    const matchesStatus = !statusFilter || l.status === statusFilter;
    const matchesPipeline = !pipelineFilter || (l.pipeline_stage || 'ליד') === pipelineFilter;
    return matchesSearch && matchesStatus && matchesPipeline;
  });

  const pipelineCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s] = leads.filter(l => (l.pipeline_stage || 'ליד') === s).length;
    return acc;
  }, {});

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div dir="rtl">
      <PricingStrategyCard />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">לידומט</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{leads.length} לידים</span>
        </div>
        <Button type="button" className="gap-2" onClick={handleNew}>
          <Plus className="w-4 h-4" /> ליד חדש
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PIPELINE_STAGES.map((stage, i) => (
          <button
            key={stage}
            type="button"
            onClick={() => setPipelineFilter(pipelineFilter === stage ? '' : stage)}
            className={`rounded-xl border p-3 text-center transition-all ${pipelineFilter === stage ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card hover:bg-muted/30'}`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">{i + 1}</span>
              <p className="text-xs font-semibold text-foreground">{stage}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{pipelineCounts[stage] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם או טלפון..." className="sm:max-w-xs" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass + ' sm:max-w-xs'}>
          <option value="">כל הסטטוסים</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={pipelineFilter} onChange={e => setPipelineFilter(e.target.value)} className={selectClass + ' sm:max-w-xs'}>
          <option value="">כל השלבים</option>
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
          אין לידים עדיין. לחץ על "ליד חדש" להוספה.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-right font-medium">שם הליד</th>
                  <th className="px-4 py-2.5 text-right font-medium">טלפון</th>
                  <th className="px-4 py-2.5 text-right font-medium">צינור</th>
                  <th className="px-4 py-2.5 text-right font-medium">סטטוס</th>
                  <th className="px-4 py-2.5 text-right font-medium">מעקב</th>
                  <th className="px-4 py-2.5 text-right font-medium">גובה עסקה</th>
                  <th className="px-4 py-2.5 text-right font-medium">LTV</th>
                  <th className="px-4 py-2.5 text-right font-medium">סך הכנסות</th>
                  <th className="px-4 py-2.5 text-right font-medium">התחייבויות חודשי</th>
                  <th className="px-4 py-2.5 text-right font-medium">נוצר</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, idx) => {
                  const ltv = calcLTV(lead.deal);
                  const inc1 = calcTotalIncome(lead.borrower1);
                  const inc2 = calcTotalIncome(lead.borrower2);
                  const totalInc = inc1 + inc2;
                  const totalComm = calcTotalCommitments(lead.commitments);
                  return (
                    <tr key={lead.id} className={`border-b border-border last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{lead.lead_name || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground" dir="ltr">{lead.phone || '—'}</td>
                      <td className="px-4 py-2.5">
                        <PipelineBadge stage={lead.pipeline_stage} />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-600'}`}>{lead.status || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <FollowupBadge lead={lead} />
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-primary">{lead.deal_value > 0 ? fmt(lead.deal_value) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-primary">{ltv > 0 ? `${ltv}%` : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-emerald-700">{totalInc > 0 ? fmt(totalInc) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-amber-700">{totalComm > 0 ? fmt(totalComm) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{lead.created_date ? new Date(lead.created_date).toLocaleDateString('he-IL') : '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setViewLead(lead)} title="פתח ליד" className="text-muted-foreground hover:text-accent transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleEdit(lead)} className="text-muted-foreground hover:text-primary transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDelete(lead.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditLead(null); } }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{editLead ? 'עריכת ליד' : 'ליד חדש'}</DialogTitle>
          </DialogHeader>
          <LeadomatForm
            initialData={editLead || null}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditLead(null); }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewLead} onOpenChange={(open) => !open && setViewLead(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{viewLead?.lead_name || 'פרטי ליד'}</DialogTitle>
          </DialogHeader>
          {viewLead && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                {viewLead.source && <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{viewLead.source}</span>}
                {viewLead.phone && <span className="text-muted-foreground" dir="ltr">{viewLead.phone}</span>}
                {viewLead.referrer_name && <span className="text-muted-foreground">ממליץ: {viewLead.referrer_name}</span>}
              </div>
              <PipelineStepper lead={viewLead} onStageChange={(stage) => handleStageChange(viewLead, stage)} saving={updatingStage} />
              <FollowUpManager lead={viewLead} onUpdate={(patch) => handleFollowupUpdate(viewLead, patch)} saving={updatingStage} />
              <LeadomatDetail lead={viewLead} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { const l = viewLead; setViewLead(null); handleEdit(l); }} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> ערוך
                </Button>
                <Button type="button" size="sm" onClick={() => setViewLead(null)}>סגור</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}