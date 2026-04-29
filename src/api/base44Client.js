import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const resolvedAppBaseUrl = appBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: resolvedAppBaseUrl,
  requiresAuth: false,
  appBaseUrl: resolvedAppBaseUrl
});
