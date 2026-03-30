function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function getApprovalInsightsHost(approvals) {
  const list = Array.isArray(approvals) ? approvals : [];
  return list.find((approval) => normalizeObject(approval.ai_data).shared_insights) || list[0] || null;
}

export function getSharedApprovalInsights(approvals) {
  const host = getApprovalInsightsHost(approvals);
  if (!host) return null;

  const aiData = normalizeObject(host.ai_data);
  const sharedInsights = normalizeObject(aiData.shared_insights);

  return Object.keys(sharedInsights).length ? { hostApprovalId: host.id, ...sharedInsights } : null;
}

export function buildApprovalWithSharedInsights(approval, sharedInsights) {
  const aiData = normalizeObject(approval.ai_data);

  return {
    ...approval,
    ai_data: {
      ...aiData,
      shared_insights: {
        ...normalizeObject(aiData.shared_insights),
        ...sharedInsights,
      },
    },
  };
}
