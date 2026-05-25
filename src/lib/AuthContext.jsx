import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

function getInvokeError(result) {
  return (
    result?.error ||
    result?.data?.error ||
    result?.response?.data?.error ||
    null
  );
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeCase, setActiveCase] = useState(null);
  const [caseMembers, setCaseMembers] = useState([]);
  const [pendingCaseInvites, setPendingCaseInvites] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      try {
        const profiles = await base44.entities.ClientProfile.filter({ email: currentUser.email });
        if (profiles.length > 0 && profiles[0].full_name) {
          currentUser.full_name = profiles[0].full_name;
        }
      } catch (e) {
      }

      setUser(currentUser);
      await loadCaseAccess(currentUser);

      if (currentUser.role !== 'admin' && currentUser.email) {
        const sessionKey = `admin-login-notified:${String(currentUser.email).toLowerCase()}`;
        if (!sessionStorage.getItem(sessionKey)) {
          try {
            const notificationRes = await base44.functions.invoke('trackClientLogin', {});

            const notificationError = getInvokeError(notificationRes);
            if (notificationError) {
              throw new Error(notificationError);
            }

            sessionStorage.setItem(sessionKey, '1');
            console.log('trackClientLogin result', notificationRes?.data || notificationRes);
          } catch (notificationError) {
            console.error('Failed to track client login:', notificationError);
          }
        }
      }

      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);

      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const loadCaseAccess = async (currentUser) => {
    if (!currentUser?.email) {
      setActiveCase(null);
      setCaseMembers([]);
      setPendingCaseInvites([]);
      return null;
    }

    let resolvedCase = null;
    let resolvedMembers = [];
    let resolvedInvites = [];

    try {
       const directProfiles = await base44.entities.ClientProfile.filter({ email: currentUser.email });
       if (directProfiles.length > 0) {
         resolvedCase = directProfiles[0];
       }
     } catch (error) {
       console.error('Case access resolution failed:', error);
     }

     // If no direct profile found, check if user is a co-borrower via CaseUser
     if (!resolvedCase) {
       try {
         const memberships = await base44.entities.CaseUser.filter({ user_email: currentUser.email, status: 'active' }, '-created_date');
         if (memberships.length > 0) {
           // Use the most recently added membership
           const caseProfileId = memberships[0].case_profile_id;
           // Fetch via backend function that uses service role
           const res = await base44.functions.invoke('getCaseProfile', { case_profile_id: caseProfileId });
           if (res?.data?.profile) {
             resolvedCase = res.data.profile;
           }
         }
       } catch (e) {
         console.error('CaseUser lookup failed:', e);
       }
     }

     if (resolvedCase) {
       const hasPrimaryMember = resolvedMembers.some((member) => member.email === resolvedCase.email);
       if (!hasPrimaryMember) {
         resolvedMembers.unshift({
           id: `primary-${resolvedCase.id}`,
           email: resolvedCase.email,
           full_name: resolvedCase.full_name || resolvedCase.email,
           role: 'primary_borrower',
           status: 'active',
           joined_at: null,
           invited_by_email: null,
           is_primary: true,
         });
       }
     }

    setActiveCase(resolvedCase);
    setCaseMembers(resolvedMembers);
    setPendingCaseInvites(resolvedInvites);
    return resolvedCase;
  };

  const logout = (shouldRedirect = true) => {
    if (user?.email) {
      const sessionKey = `admin-login-notified:${String(user.email).toLowerCase()}`;
      sessionStorage.removeItem(sessionKey);
    }

    setUser(null);
    setActiveCase(null);
    setCaseMembers([]);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      activeCase,
      caseMembers,
      pendingCaseInvites,
      caseEmail: activeCase?.email || user?.email || null,
      isPrimaryCaseUser: activeCase?.email === user?.email,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      refreshCaseAccess: () => loadCaseAccess(user),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};