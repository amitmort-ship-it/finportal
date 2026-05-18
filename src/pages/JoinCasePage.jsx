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
  const [errorMsg, setErrorMsg] = useState('');
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
        toast.success('You have joined the shared mortgage case');
      } catch (error) {
        const msg = error?.response?.data?.error || error.message || 'Failed to join the case';
        setStatus('error');
        setErrorMsg(msg);
        toast.error(msg);
      }
    };

    acceptInvite();
  }, [token, user?.email]);

  if (!token) {
    return <div className="text-center py-12 text-muted-foreground">Missing invite token.</div>;
  }

  if (!user?.email) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Join Shared Case</h1>
        <p className="text-muted-foreground">
          Log in or sign up with the invited email address to join the mortgage case.
        </p>
        <Button onClick={navigateToLogin}>Continue to login</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Join Shared Case</h1>

      {status === 'loading' ? (
        <p className="text-muted-foreground">Connecting you to the shared mortgage case...</p>
      ) : null}

      {status === 'success' ? (
        <>
          <p className="text-muted-foreground">Your access was added successfully.</p>
          <Button asChild>
            <Link to="/">Go to dashboard</Link>
          </Button>
        </>
      ) : null}

      {status === 'error' ? (
        <p className="text-destructive">{errorMsg || 'We could not verify this invite for your account.'}</p>
      ) : null}
    </div>
  );
}