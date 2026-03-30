function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

const SHARED_INSIGHTS_REGEX = /\[\[shared_insights:([^\]]+)\]\]/i;

function decodeSharedInsightsFromNotes(notes) {
  if (typeof notes !== 'string' || !notes.trim()) return null;

  const match = notes.match(SHARED_INSIGHTS_REGEX);
  if (!match?.[1]) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function stripSharedInsightsMarker(notes) {
  if (typeof notes !== 'string') return '';
  return notes.replace(SHARED_INSIGHTS_REGEX, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function attachSharedInsightsToNotes(notes, sharedInsights) {
  const cleanNotes = stripSharedInsightsMarker(notes || '');
  const encoded = encodeURIComponent(JSON.stringify(sharedInsights));
  const marker = `[[shared_insights:${encoded}]]`;

  return cleanNotes ? `${cleanNotes}\n\n${marker}` : marker;
}

export function readSharedInsightsFromApproval(approval) {
  const aiData = normalizeObject(approval?.ai_data);
  const aiSharedInsights = normalizeObject(aiData.shared_insights);

  if (Object.keys(aiSharedInsights).length) {
    return aiSharedInsights;
  }

  const notesSharedInsights = normalizeObject(decodeSharedInsightsFromNotes(approval?.notes));
  return Object.keys(notesSharedInsights).length ? notesSharedInsights : null;
}

export function getApprovalInsightsHost(approvals) {
  const list = Array.isArray(approvals) ? approvals : [];
  return list.find((approval) => readSharedInsightsFromApproval(approval)) || list[0] || null;
}

export function getSharedApprovalInsights(approvals) {
  const host = getApprovalInsightsHost(approvals);
  if (!host) return null;

  const sharedInsights = normalizeObject(readSharedInsightsFromApproval(host));

  return Object.keys(sharedInsights).length ? { hostApprovalId: host.id, ...sharedInsights } : null;
}

export function buildApprovalWithSharedInsights(approval, sharedInsights) {
  const aiData = normalizeObject(approval.ai_data);

  return {
    ...approval,
    notes: attachSharedInsightsToNotes(approval.notes, sharedInsights),
    ai_data: {
      ...aiData,
      shared_insights: {
        ...normalizeObject(aiData.shared_insights),
        ...sharedInsights,
      },
    },
  };
}
