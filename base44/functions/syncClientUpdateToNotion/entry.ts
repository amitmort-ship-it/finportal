import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const DEFAULT_EMAIL_PROPERTY = 'Email';

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
    const message = data?.message || `Notion request failed with status ${response.status}`;
    throw new Error(message);
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
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = Deno.env.get('NOTION_API_KEY');
    const databaseId = Deno.env.get('NOTION_CLIENTS_DATABASE_ID');
    const emailPropertyName = Deno.env.get('NOTION_CLIENT_EMAIL_PROPERTY') || DEFAULT_EMAIL_PROPERTY;

    if (!apiKey || !databaseId) {
      return Response.json(
        {
          error: 'Missing Notion configuration',
          missing: {
            NOTION_API_KEY: !apiKey,
            NOTION_CLIENTS_DATABASE_ID: !databaseId,
          },
        },
        { status: 500 },
      );
    }

    const payload = await req.json();
    const clientEmail = normalizeEmail(payload?.client_email);
    const message = String(payload?.message || '').trim();
    const createdAt = payload?.created_date || new Date().toISOString();
    const clientName = String(payload?.client_name || clientEmail || 'לקוח').trim();

    if (!clientEmail || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
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
      return Response.json(
        {
          error: 'Client page not found in Notion',
          client_email: clientEmail,
          property: emailPropertyName,
        },
        { status: 404 },
      );
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
    console.error('syncClientUpdateToNotion error:', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});
