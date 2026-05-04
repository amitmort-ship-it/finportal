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

  const payload = await req.json().catch(() => ({}));
  const parentPageId = payload?.parent_page_id;

  // Search for existing business DB first
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

  // Need a parent page — either provided or find first accessible page
  let resolvedParentPageId = parentPageId;

  if (!resolvedParentPageId) {
    // Search for any page we can use as parent
    const pageSearch = await notionFetch('/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: { value: 'page', property: 'object' },
        page_size: 1,
      }),
    }, apiKey);

    const firstPage = pageSearch?.results?.[0];
    if (firstPage?.id) {
      resolvedParentPageId = firstPage.id;
    }
  }

  if (!resolvedParentPageId) {
    return Response.json({
      error: 'לא נמצא דף בנושן. אנא העבר parent_page_id של דף קיים בנושן, או וודא שה-API key מחובר לדף.',
      hint: 'פתח את הנושן, צור דף חדש, שתף אותו עם ה-integration, ושלח את ה-page ID'
    }, { status: 400 });
  }

  // Create the database inside that page
  const db = await notionFetch('/databases', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: resolvedParentPageId },
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

  return Response.json({ success: true, database_id: db.id, created: true, parent_page_id: resolvedParentPageId });
});