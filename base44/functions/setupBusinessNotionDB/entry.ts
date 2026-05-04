import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function notionFetch(path, init, apiKey) {
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
    throw new Error(`Notion error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const apiKey = Deno.env.get('NOTION_API_KEY');
  if (!apiKey) return Response.json({ error: 'NOTION_API_KEY not set' }, { status: 400 });

  const payload = await req.json();
  const parentPageId = payload?.parent_page_id; // optional - if not provided, will create in workspace

  // Search for existing business DB
  const searchResult = await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query: 'ניהול עסק — נתוני מערכת',
      filter: { value: 'database', property: 'object' },
    }),
  }, apiKey);

  const existing = searchResult?.results?.[0];
  if (existing?.id) {
    return Response.json({ success: true, database_id: existing.id, already_existed: true });
  }

  // Create the database
  const parentConfig = parentPageId
    ? { type: 'page_id', page_id: parentPageId }
    : { type: 'workspace', workspace: true };

  const db = await notionFetch('/databases', {
    method: 'POST',
    body: JSON.stringify({
      parent: parentConfig,
      title: [{ type: 'text', text: { content: 'ניהול עסק — נתוני מערכת' } }],
      properties: {
        'שם': { title: {} },
        'סוג': {
          select: {
            options: [
              { name: 'עסקה', color: 'blue' },
              { name: 'הכנסה', color: 'green' },
              { name: 'הוצאה קבועה', color: 'red' },
              { name: 'הוצאה משתנה', color: 'orange' },
            ],
          },
        },
        'סכום': { number: { format: 'number' } },
        'קטגוריה': { rich_text: {} },
        'סטטוס': { rich_text: {} },
        'תאריך': { rich_text: {} },
        'חודש': { rich_text: {} },
        'נשאר לתשלום': { number: { format: 'number' } },
        'נגבה': { number: { format: 'number' } },
        'מוקפא': {
          select: {
            options: [
              { name: 'לא', color: 'green' },
              { name: 'כן', color: 'gray' },
            ],
          },
        },
        'ID מקומי': { rich_text: {} },
        'עודכן לאחרונה': { rich_text: {} },
      },
    }),
  }, apiKey);

  return Response.json({ success: true, database_id: db.id, created: true });
});