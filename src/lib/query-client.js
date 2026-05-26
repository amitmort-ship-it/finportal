import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 1000 * 60 * 2,   // נתונים נחשבים טריים ל-2 דקות
			gcTime: 1000 * 60 * 10,      // נשמרים ב-cache ל-10 דקות
		},
	},
});