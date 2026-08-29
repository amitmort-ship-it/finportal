import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const CHAT_ID = '-1003701654849';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role so scheduled automation (no user) can read all leads
    const leads = await base44.asServiceRole.entities.Leadomat.list('-created_date', 500);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStages = ['ליד', 'פגישה', 'הצעה'];

    // Overdue: follow-up date passed and not yet signed
    const overdue = (leads || []).filter(l => {
      if (!l.next_followup_date) return false;
      if (l.pipeline_stage && !activeStages.includes(l.pipeline_stage)) return false;
      const d = new Date(l.next_followup_date);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });

    // Due today
    const dueToday = (leads || []).filter(l => {
      if (!l.next_followup_date) return false;
      if (l.pipeline_stage && !activeStages.includes(l.pipeline_stage)) return false;
      const d = new Date(l.next_followup_date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    // Upcoming (next 3 days, not today/overdue)
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const upcoming = (leads || []).filter(l => {
      if (!l.next_followup_date) return false;
      if (l.pipeline_stage && !activeStages.includes(l.pipeline_stage)) return false;
      const d = new Date(l.next_followup_date);
      d.setHours(0, 0, 0, 0);
      return d > today && d <= in3Days;
    });

    // No follow-up date set but still active (no follow-up scheduled)
    const noFollowup = (leads || []).filter(l => {
      if (l.pipeline_stage && !activeStages.includes(l.pipeline_stage)) return false;
      return !l.next_followup_date;
    });

    const totalAttention = overdue.length + dueToday.length;

    if (totalAttention === 0 && upcoming.length === 0 && noFollowup.length === 0) {
      return Response.json({ success: true, message: 'אין תזכורות', overdue: 0, dueToday: 0, upcoming: 0, noFollowup: 0 });
    }

    const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL');
    const lines = [];

    lines.push(`🔔 *תזכורות Follow-up — ${fmtDate(today)}*\n`);

    if (overdue.length > 0) {
      lines.push(`🔴 *איחרו (${overdue.length}):*`);
      overdue.forEach(l => {
        const daysLate = Math.floor((today - new Date(l.next_followup_date)) / 86400000);
        lines.push(`• *${l.lead_name}* — ${fmtDate(l.next_followup_date)} (${daysLate} ימים)${l.phone ? ` | ${l.phone}` : ''}${l.followup_notes ? `\n  _${l.followup_notes}_` : ''}`);
      });
      lines.push('');
    }

    if (dueToday.length > 0) {
      lines.push(`🟡 *היום (${dueToday.length}):*`);
      dueToday.forEach(l => {
        lines.push(`• *${l.lead_name}* — היום${l.phone ? ` | ${l.phone}` : ''}${l.followup_notes ? `\n  _${l.followup_notes}_` : ''}`);
      });
      lines.push('');
    }

    if (upcoming.length > 0) {
      lines.push(`🔵 *בקרוב (${upcoming.length}):*`);
      upcoming.forEach(l => {
        lines.push(`• *${l.lead_name}* — ${fmtDate(l.next_followup_date)}${l.phone ? ` | ${l.phone}` : ''}`);
      });
      lines.push('');
    }

    if (noFollowup.length > 0) {
      lines.push(`⚪ *ללא מעקב (${noFollowup.length}):*`);
      noFollowup.slice(0, 10).forEach(l => {
        lines.push(`• *${l.lead_name}*${l.phone ? ` | ${l.phone}` : ''}`);
      });
      if (noFollowup.length > 10) lines.push(`  _ועוד ${noFollowup.length - 10}_`);
      lines.push('');
    }

    const message = lines.join('\n');

    const TELEGRAM_BOT_TOKEN = secrets.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      return Response.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      return Response.json({ error: data.description }, { status: 400 });
    }

    return Response.json({
      success: true,
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      noFollowup: noFollowup.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}