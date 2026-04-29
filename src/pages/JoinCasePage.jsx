import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function JoinCasePage() {
  const [params] = useSearchParams();
  const { user, navigateToLogin, refreshCaseAccess } = useAuth();
  const [status, setStatus] = useState('idle');
  const token = params.get('token');

  useEffect(() => {
    if (!token || !user?.email || status === 'success') {
      return;
    }

    const acceptInvite = async () => {
      setStatus('loading');
      try {
        await base44.functions.invoke('acceptCaseInvite', { token });
        await refreshCaseAccess();
        setStatus('success');
        toast.success('הצטרפת בהצלחה לתיק המשכנתא המשותף');
      } catch (error) {
        setStatus('error');
        toast.error(error.message || 'לא הצלחנו לצרף אותך לתיק');
      }
    };

    acceptInvite();
  }, [token, user?.email]);

  if (!token) {
    return <div className="text-center py-12 text-muted-foreground">קישור ההזמנה אינו תקין או שחסר בו מזהה הזמנה.</div>;
  }

  if (!user?.email) {
    return (
      <div dir="rtl" className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">הצטרפות לתיק משותף</h1>
        <p className="text-muted-foreground">יש להתחבר או להירשם עם כתובת המייל שאליה נשלחה ההזמנה כדי להצטרף לתיק.</p>
        <Button onClick={navigateToLogin}>מעבר להתחברות</Button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-md mx-auto py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold text-foreground">הצטרפות לתיק משותף</h1>
      {status === 'loading' ? <p className="text-muted-foreground">מחברים אותך עכשיו לתיק המשכנתא המשותף...</p> : null}
      {status === 'success' ? (
        <>
          <p className="text-muted-foreground">הגישה נוספה בהצלחה.</p>
          <Button asChild><Link to="/">מעבר למסך הראשי</Link></Button>
        </>
      ) : null}
      {status === 'error' ? <p className="text-destructive">לא הצלחנו לאמת את ההזמנה עבור החשבון הזה.</p> : null}
    </div>
  );
}
