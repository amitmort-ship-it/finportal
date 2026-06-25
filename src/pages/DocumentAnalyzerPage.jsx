import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, Send, Bot, User, Paperclip, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function DocumentAnalyzerPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConversation) return;
    const unsub = base44.agents.subscribeToConversation(activeConversation.id, (data) => {
      setMessages(data.messages || []);
      setIsSending(false);
    });
    return () => unsub();
  }, [activeConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const convs = await base44.agents.listConversations({ agent_name: 'document_analyzer' });
    setConversations(convs || []);
  };

  const startNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'document_analyzer',
      metadata: { name: `ניתוח מסמכים - ${new Date().toLocaleDateString('he-IL')}` }
    });
    setActiveConversation(conv);
    setMessages([]);
    setUploadedFiles([]);
    await loadConversations();
  };

  const selectConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConversation(full);
    setMessages(full.messages || []);
    setUploadedFiles([]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url });
    }
    setUploadedFiles(prev => [...prev, ...uploaded]);
    setIsUploading(false);
    e.target.value = '';
  };

  const sendMessage = async () => {
    if (!activeConversation) return;
    if (!inputText.trim() && uploadedFiles.length === 0) return;

    const text = inputText.trim() || (uploadedFiles.length > 0 ? 'אנא נתח את המסמכים המצורפים' : '');
    const file_urls = uploadedFiles.map(f => f.url);

    setIsSending(true);
    setInputText('');
    setUploadedFiles([]);

    await base44.agents.addMessage(activeConversation, {
      role: 'user',
      content: text,
      ...(file_urls.length > 0 && { file_urls })
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4" dir="rtl">
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-2 shrink-0">
        <Button onClick={startNewConversation} className="w-full">
          <Bot className="w-4 h-4" />
          שיחה חדשה
        </Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                activeConversation?.id === conv.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              {conv.metadata?.name || 'שיחה'}
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <FileText className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium">סוכן ניתוח מסמכים</p>
            <p className="text-sm text-center max-w-xs">
              העלה מסמכים פיננסיים (תלושי שכר, דפי חשבון, הלוואות, ת.ז.) וקבל ניתוח מפורט
            </p>
            <Button onClick={startNewConversation}>
              <Bot className="w-4 h-4" />
              התחל ניתוח
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm mt-8">
                  העלה מסמכים ולחץ שלח לניתוח
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    {msg.role === 'assistant'
                      ? <ReactMarkdown className="prose prose-sm max-w-none text-right [&>*]:text-right">{msg.content}</ReactMarkdown>
                      : <p className="whitespace-pre-wrap">{msg.content}</p>
                    }
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-muted rounded-xl px-4 py-3 flex gap-1 items-center">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-border p-4 space-y-3">
              {/* Uploaded files preview */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-lg px-3 py-1.5 text-xs">
                      <FileText className="w-3 h-3" />
                      <span className="max-w-[120px] truncate">{f.name}</span>
                      <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="העלה מסמך"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </Button>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="כתוב הוראות לניתוח או העלה מסמכים..."
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[40px] max-h-[120px] focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isSending || (!inputText.trim() && uploadedFiles.length === 0)}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}