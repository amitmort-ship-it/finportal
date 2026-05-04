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

function getText(page, key) {
  return page?.properties?.[key]?.rich_text?.[0]?.text?.content || '';
}
function getNumber(page, key) {
  const val = page?.properties?.[key]?.number;
  return val !== null && val !== undefined ? Number(val) : 0;
}
function getSelect(page, key) {
  return page?.properties?.[key]?.select?.name || '';
}
function getTitle(page) {
  return page?.properties?.['שם']?.title?.[0]?.text?.content || '';
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // This can be called from automation (no user) or from admin
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch (_) {
    // called from automation — allow
    isAdmin = true;
  }

  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const apiKey = Deno.env.get('NOTION_API_KEY');
  if (!apiKey) return Response.json({ error: 'NOTION_API_KEY not set' }, { status: 400 });

  const databaseId = await getOrFindDatabase(apiKey);
  if (!databaseId) {
    return Response.json({ error: 'Notion database not found' }, { status: 404 });
  }

  const pages = await getAllPagesInDB(databaseId, apiKey);

  // Load current business data
  const records = await base44.asServiceRole.entities.BusinessData.filter({ key: 'main' });
  const businessData = records[0];
  if (!businessData) {
    return Response.json({ error: 'No business data found' }, { status: 404 });
  }

  const existingDeals = [...(businessData.dealLog || [])];
  const existingIncome = [...(businessData.incomeLog || [])];
  const existingFixed = [...(businessData.fixedExpenses || [])];
  const existingVariable = [...(businessData.variableExpenses || [])];

  let changes = 0;

  for (const page of pages) {
    if (page.archived) continue;

    const type = getSelect(page, 'סוג');
    const localId = getText(page, 'ID מקומי');
    const name = getTitle(page);

    if (!localId && !name) continue;

    if (type === 'עסקה') {
      const idx = existingDeals.findIndex(d => String(d.id) === localId);
      const totalAmount = getNumber(page, 'סכום');
      const paidAmount = getNumber(page, 'נגבה');
      const bucket = getText(page, 'סטטוס');
      const isFrozen = getSelect(page, 'מוקפא') === 'כן';
      const category = getText(page, 'קטגוריה');

      if (idx >= 0) {
        const deal = existingDeals[idx];
        const hasChange =
          deal.totalAmount !== totalAmount ||
          deal.paidAmount !== paidAmount ||
          deal.bucket !== bucket ||
          deal.isFrozen !== isFrozen ||
          deal.category !== category ||
          deal.clientName !== name;

        if (hasChange) {
          existingDeals[idx] = {
            ...deal,
            clientName: name || deal.clientName,
            totalAmount,
            paidAmount,
            bucket,
            isFrozen,
            category: category || deal.category,
            updatedAt: new Date().toISOString(),
          };
          changes++;
        }
      } else if (name && totalAmount > 0) {
        // New deal created in Notion
        existingDeals.push({
          id: Date.now() + Math.random(),
          clientName: name,
          totalAmount,
          paidAmount,
          bucket: bucket || 'חדש',
          isFrozen,
          category: category || 'משכנתאות',
          createdAt: new Date().toISOString(),
        });
        changes++;
      }
    } else if (type === 'הוצאה קבועה') {
      const idx = existingFixed.findIndex(e => String(e.id) === localId);
      const amount = getNumber(page, 'סכום');
      const status = getText(page, 'סטטוס');
      const enabled = status !== 'מושבת';

      if (idx >= 0) {
        const exp = existingFixed[idx];
        if (exp.amount !== amount || exp.enabled !== enabled || exp.name !== name) {
          existingFixed[idx] = { ...exp, name: name || exp.name, amount, enabled };
          changes++;
        }
      }
    }
  }

  if (changes > 0) {
    await base44.asServiceRole.entities.BusinessData.update(businessData.id, {
      dealLog: existingDeals,
      incomeLog: existingIncome,
      fixedExpenses: existingFixed,
      variableExpenses: existingVariable,
    });
  }

  return Response.json({ success: true, changes, pages_read: pages.length });
});