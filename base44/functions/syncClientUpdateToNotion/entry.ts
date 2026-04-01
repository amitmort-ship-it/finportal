import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DEFAULT_EMAIL_PROPERTY = 'Email';
const DEFAULT_DATABASE_ID = '304051ce360080539d38c4a852b964cb';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

async function notionFetch(path: string, init: RequestInit, apiKey: string) {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      JSON.stringify({
        step: path,
        status: response.status,
        notion_error: data,
      }),
    );
  }

  return data;
}

function findPageByEmail(results: any[], clientEmail: string, emailPropertyName: string) {
  return results.find((page) => {
    const property = page?.properties?.[emailPropertyName];
    const emailValue = property?.email;
    return normalizeEmail(emailValue) === normalizeEmail(clientEmail);
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' });
    }

    const apiKey = Deno.env.get('NOTION_API_KEY');
    const databaseId = DEFAULT_DATABASE_ID;
    const emailPropertyName = DEFAULT_EMAIL_PROPERTY;

    if (!apiKey) {
      return Response.json({
        error: 'Missing Notion configuration',
        missing: {
          NOTION_API_KEY: true,
        },
      });
    }

    const payload = await req.json();
    const clientEmail = normalizeEmail(payload?.client_email);
    const message = String(payload?.message || '').trim();
    const createdAt = payload?.created_date || new Date().toISOString();
    const clientName = String(payload?.client_name || clientEmail || 'לקוח').trim();

    if (!clientEmail || !message) {
      return Response.json({ error: 'Missing required fields' });
    }

    const queryResult = await notionFetch(
      `/databases/${databaseId}/query`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          filter: {
            property: emailPropertyName,
            email: {
              equals: clientEmail,
            },
          },
        }),
      },
      apiKey,
    );

    const page = findPageByEmail(queryResult?.results || [], clientEmail, emailPropertyName);

    if (!page?.id) {
      return Response.json({
        error: 'Client page not found in Notion',
        client_email: clientEmail,
        property: emailPropertyName,
        query_count: queryResult?.results?.length || 0,
      });
    }

    await notionFetch(
      `/blocks/${page.id}/children`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          children: [
            {
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: `[${new Date(createdAt).toLocaleString('he-IL')}] ${message}`,
                    },
                  },
                ],
                color: 'default',
              },
            },
          ],
        }),
      },
      apiKey,
    );

    return Response.json({
      success: true,
      page_id: page.id,
      client_email: clientEmail,
      client_name: clientName,
    });
  } catch (error) {
    return Response.json({
      error: error?.message || 'Unknown error',
    });
  }
});
