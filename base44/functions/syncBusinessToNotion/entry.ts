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

async function getOrFindDatabase(apiKey) {
  const searchResult = await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query: 'ניהול עסק — נתוני מערכת',
      filter: { value: 'database', property: 'object' },
    }),
  }, apiKey);
  return searchResult?.results?.[0]?.id || null;
}

async function getAllPagesInDB(databaseId, apiKey) {
  const pages = [];
  let cursor = undefined;
  do {
    const res = await notionFetch(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    }, apiKey);
    pages.push(...(res.results || []));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function getTextProp(page, key) {
  return page?.properties?.[key]?.rich_text?.[0]?.text?.content || '';
}

function buildProperties(item, type) {
  const now = new Date().toISOString();
  const base = {
    'שם': { title: [{ text: { content: String(item.name || item.clientName || item.source || 'ללא שם') } }] },
    'סוג': { select: { name: type } },
    'קטגוריה': { rich_text: [{ text: { content: String(item.category || '') } }] },
    'ID מקומי': { rich_text: [{ text: { content: String(item.id) } }] },
    'עודכן לאחרונה': { rich_text: [{ text: { content: now } }] },
  };

  if (type === 'עסקה') {
    base['סכום'] = { number: Number(item.totalAmount || 0) };
    base['נגבה'] = { number: Number(item.paidAmount || 0) };
    base['נשאר לתשלום'] = { number: Math.max(0, Number(item.totalAmount || 0) - Number(item.paidAmount || 0)) };
    base['מוקפא'] = { select: { name: item.isFrozen ? 'כן' : 'לא' } };
    base['סטטוס'] = { rich_text: [{ text: { content: String(item.bucket || '') } }] };
    base['תאריך'] = { rich_text: [{ text: { content: String(item.createdAt || '') } }] };
  } else if (type === 'הכנסה') {
    base['סכום'] = { number: Number(item.gross || 0) };
    base['חודש'] = { rich_text: [{ text: { content: String(item.month || '') } }] };
    base['תאריך'] = { rich_text: [{ text: { content: String(item.date || '') } }] };
  } else if (type === 'הוצאה קבועה') {
    base['סכום'] = { number: Number(item.amount || 0) };
    base['סטטוס'] = { rich_text: [{ text: { content: item.enabled === false ? 'מושבת' : 'פעיל' } }] };
  } else if (type === 'הוצאה משתנה') {
    base['סכום'] = { number: Number(item.totalAmount || 0) };
    base['סטטוס'] = { rich_text: [{ text: { content: `${item.paidInstallments || 0}/${item.installments || 1} תשלומים` } }] };
    base['נגבה'] = { number: Number(item.installmentAmount || 0) };
  }

  return base;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const apiKey = Deno.env.get('NOTION_API_KEY');
  if (!apiKey) return Response.json({ error: 'NOTION_API_KEY not set' }, { status: 400 });

  const databaseId = await getOrFindDatabase(apiKey);
  if (!databaseId) {
    return Response.json({ error: 'Notion database not found. Please run setup first.' }, { status: 404 });
  }

  // Load business data
  const records = await base44.entities.BusinessData.filter({ key: 'main' });
  const businessData = records[0];
  if (!businessData) {
    return Response.json({ error: 'No business data found' }, { status: 404 });
  }

  const { dealLog = [], incomeLog = [], fixedExpenses = [], variableExpenses = [] } = businessData;

  // Get all existing Notion pages to find by local ID
  const existingPages = await getAllPagesInDB(databaseId, apiKey);
  const pageByLocalId = {};
  for (const page of existingPages) {
    const localId = getTextProp(page, 'ID מקומי');
    if (localId) pageByLocalId[localId] = page.id;
  }

  let created = 0;
  let updated = 0;

  async function upsert(item, type) {
    const localId = String(item.id);
    const props = buildProperties(item, type);

    if (pageByLocalId[localId]) {
      await notionFetch(`/pages/${pageByLocalId[localId]}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: props }),
      }, apiKey);
      updated++;
    } else {
      await notionFetch('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: props,
        }),
      }, apiKey);
      created++;
    }
  }

  // Sync all items (sequentially to avoid rate limits)
  for (const deal of dealLog) await upsert(deal, 'עסקה');
  for (const income of incomeLog) await upsert(income, 'הכנסה');
  for (const expense of fixedExpenses) await upsert(expense, 'הוצאה קבועה');
  for (const expense of variableExpenses) await upsert(expense, 'הוצאה משתנה');

  return Response.json({
    success: true,
    created,
    updated,
    total: dealLog.length + incomeLog.length + fixedExpenses.length + variableExpenses.length,
  });
});