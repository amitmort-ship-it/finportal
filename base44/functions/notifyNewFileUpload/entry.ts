import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function encodeSubject(subject) {
  const encoded = btoa(unescape(encodeURIComponent(subject)));
  return `=?UTF-8?B?${encoded}?=`;
}

function buildMimeMessage({ to, subject, bodyHtml }) {
  const safeHtml = bodyHtml.replace(/\r?\n/g, ' ');
  const msg = [
    `To: ${to.trim()}`,
    `Subject: ${encodeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(safeHtml))),
  ].join('\r\n');
  return msg;
}

function base64url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { event, data, old_data } = body;

    // Only handle updates where uploaded_files changed
    if (event?.type !== 'update') {
      return Response.json({ skipped: 'not an update' });
    }

    const newFiles = Array.isArray(data?.uploaded_files) ? data.uploaded_files : [];
    const oldFiles = Array.isArray(old_data?.uploaded_files) ? old_data.uploaded_files : [];

    if (newFiles.length <= oldFiles.length) {
      return Response.json({ skipped: 'no new files added' });
    }

    // Find the newly added files
    const oldUrls = new Set(oldFiles.map(f => f.file_url));
    const addedFiles = newFiles.filter(f => !oldUrls.has(f.file_url));

    if (!addedFiles.length) {
      return Response.json({ skipped: 'no new files detected' });
    }

    // Get admin email from the Gmail connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get admin email from Google tokeninfo
    const tokenRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
    const tokenInfo = await tokenRes.json();
    const adminEmail = tokenInfo.email;
    if (!adminEmail) {
      return Response.json({ error: 'Could not determine admin email', tokenInfo }, { status: 500 });
    }

    const clientEmail = data.client_email || 'לא ידוע';
    const docTitle = data.title || 'מסמך';
    const fileList = addedFiles.map(f => `<li>${f.file_name || 'קובץ'}</li>`).join('');

    const subject = `📄 מסמך חדש הועלה — ${clientEmail}`;
    const bodyHtml = `
      <div dir="rtl" style="font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a;">
        <h2 style="color: #2563eb;">מסמך חדש הועלה לתיק</h2>
        <p><strong>לקוח:</strong> ${clientEmail}</p>
        <p><strong>בקשת מסמך:</strong> ${docTitle}</p>
        <p><strong>קבצים שהועלו:</strong></p>
        <ul>${fileList}</ul>
        <hr/>
        <p style="color: #6b7280; font-size: 12px;">הודעה אוטומטית ממערכת ניהול התיקים</p>
      </div>
    `;

    const mime = buildMimeMessage({ to: adminEmail, subject, bodyHtml });
    const encoded = base64url(mime);

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ sent: true, to: adminEmail, files: addedFiles.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});