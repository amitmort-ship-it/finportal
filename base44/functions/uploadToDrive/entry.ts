import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, file_name, client_email, category } = await req.json();
    if (!file_url || !file_name || !client_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get or create client folder
    const folders = await base44.asServiceRole.entities.DriveFolder.filter({ client_email });
    let folderId;

    if (folders.length > 0) {
      folderId = folders[0].folder_id;
    } else {
      // Create new folder for this client
      const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client_email,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      const folder = await folderRes.json();
      folderId = folder.id;
      await base44.asServiceRole.entities.DriveFolder.create({
        client_email,
        folder_id: folderId,
        folder_name: client_email,
      });
    }

    // Download the file from base44 storage
    const fileRes = await fetch(file_url);
    const fileBlob = await fileRes.blob();
    const mimeType = fileBlob.type || 'application/octet-stream';

    // Upload to Drive using multipart upload
    const metadata = {
      name: category ? `[${category}] ${file_name}` : file_name,
      parents: [folderId],
    };

    const boundary = 'boundary_' + Date.now();
    const metadataPart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const metaBytes = new TextEncoder().encode(metadataPart);
    const filePartBytes = new TextEncoder().encode(filePart);
    const endBytes = new TextEncoder().encode(endPart);
    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const fileBytes = new Uint8Array(fileArrayBuffer);

    const body = new Uint8Array(metaBytes.length + filePartBytes.length + fileBytes.length + endBytes.length);
    let offset = 0;
    body.set(metaBytes, offset); offset += metaBytes.length;
    body.set(filePartBytes, offset); offset += filePartBytes.length;
    body.set(fileBytes, offset); offset += fileBytes.length;
    body.set(endBytes, offset);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const uploaded = await uploadRes.json();
    if (!uploadRes.ok) {
      return Response.json({ error: 'Drive upload failed', details: uploaded }, { status: 500 });
    }

    return Response.json({ success: true, drive_file_id: uploaded.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});