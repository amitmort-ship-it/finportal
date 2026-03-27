import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Trash2, Upload, Loader2, Edit2, Check, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ApprovalsComparisonTable from '@/components/ApprovalsComparisonTable';
import { parseApprovalText } from '@/lib/approvalAnalysis';
import { extractPdfText } from '@/lib/pdfTextExtractor';

const BANKS = ['בנק הפועלים', 'בנק לאומי', 'בנק דיסקונט', 'בנק טפחות', 'הבנק הבינלאומי', 'חוץ בנקאי'];

const emptyForm = { client_email: '', bank_name: '', approval_title: '', notes: '', amount: '', monthly_payment: '', mortgage_years: '', file_url: '', file_name: '', ai_data: null };

const mergeParsedIntoForm = (currentForm, parsedResult) => {
  if (!parsedResult?.ai_data) return currentForm;

  return {
    ...currentForm,
    ai_data: parsedResult.ai_data,
    amount: currentForm.amount || parsedResult.amount || '',
    monthly_payment: currentForm.monthly_payment || parsedResult.monthly_payment || '',
    mortgage_years: currentForm.mortgage_years || parsedResult.mortgage_years || '',
  };
};

export default function AdminBankApprovals({ selectedClient }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editUploading, setEditUploading] = useState(false);

  const load = async () => {
    const [data, clientRes] = await Promise.all([
      base44.entities.BankApproval.filter({}, '-created_date'),
      base44.functions.invoke('getAllClients', {}),
    ]);
    const userList = clientRes.data?.profiles || [];
    const filtered = selectedClient ? data.filter(a => a.client_email === selectedClient) : data;
    setApprovals(filtered);
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedClient]);
  useEffect(() => { if (selectedClient) setForm(f => ({ ...f, client_email: selectedClient })); }, [selectedClient]);

  const handleFileUpload = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setLoader = isEdit ? setEditUploading : setUploading;
    const setTargetForm = isEdit ? setEditForm : setForm;
    const currentBankName = isEdit ? editForm.bank_name : form.bank_name;

    setLoader(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      let parsedResult = null;

      try {
        const analysisRes = await base44.functions.invoke('analyzeBankApproval', {
          file_url,
          file_name: file.name,
          bank_name: currentBankName || null,
        });

        const analysis = analysisRes?.data?.analysis;
        if (analysis) {
          parsedResult = {
            ai_data: analysis,
            amount: analysis.summary_metrics?.amount || null,
            monthly_payment: analysis.summary_metrics?.first_monthly_payment || null,
            mortgage_years: analysis.tracks?.[0]?.years || null,
          };
        }
      } catch (analysisError) {
        const extractedText = await extractPdfText(file).catch(() => '');
        parsedResult = extractedText
          ? parseApprovalText(extractedText, { bank_name: currentBankName })
          : null;

        if (!parsedResult) {
          toast.info('המסמך הועלה, אבל ניתוח ה-AI לא הצליח כרגע. אפשר להשלים ידנית.');
        } else {
          toast.info('ניתוח ה-AI לא הצליח, בוצע חילוץ חלקי מתוך שכבת הטקסט של ה-PDF.');
        }
      }

      setTargetForm((prev) => mergeParsedIntoForm({
        ...prev,
        file_url,
        file_name: file.name,
      }, parsedResult));

      if (parsedResult?.ai_data?.tracks?.length) {
        toast.success(`המסמך נותח ונמצאו ${parsedResult.ai_data.tracks.length} מסלולים לתמהיל המוצע`);
      } else if (parsedResult?.ai_data) {
        toast.info('המסמך הועלה וזוהו נתוני סיכום, אך לא כל המסלולים זוהו במלואם');
      } else {
        toast.info('המסמך הועלה. אם ה-PDF כולל שכבת טקסט, המערכת תמלא את נתוני ההצעה אוטומטית');
      }
    } finally {
      setLoader(false);
    }
  };

  const handleCreate = async () => {
    if (!form.client_email || !form.bank_name) return;
    const data = { ...form };
    if (data.amount) data.amount = Number(data.amount); else delete data.amount;
    if (data.monthly_payment) data.monthly_payment = Number(data.monthly_payment); else delete data.monthly_payment;
    if (data.mortgage_years) data.mortgage_years = Number(data.mortgage_years); else delete data.mortgage_years;
    await base44.entities.BankApproval.create(data);
    toast.success('אישור בנק נוסף');
    setForm({ ...emptyForm, client_email: selectedClient || '' });
    setOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.BankApproval.delete(id);
    toast.success('האישור נמחק');
    load();
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      bank_name: a.bank_name || '',
      approval_title: a.approval_title || '',
      notes: a.notes || '',
      amount: a.amount || '',
      monthly_payment: a.monthly_payment || '',
      mortgage_years: a.mortgage_years || '',
      file_url: a.file_url || '',
      file_name: a.file_name || '',
      ai_data: a.ai_data || null,
    });
  };

  const handleSaveEdit = async () => {
    const data = { ...editForm };
    if (data.amount) data.amount = Number(data.amount); else delete data.amount;
    if (data.monthly_payment) data.monthly_payment = Number(data.monthly_payment); else delete data.monthly_payment;
    if (data.mortgage_years) data.mortgage_years = Number(data.m
