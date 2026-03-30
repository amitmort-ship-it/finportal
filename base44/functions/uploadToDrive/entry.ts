import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function createDriveFolder(name, parentId, authHeader) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.id;
}

async function driveFolderExists(folderId, authHeader) {
  if (!folderId) return false;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`, {
    headers: authHeader,
  });

  return res.ok;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, file_name, client_email } = await req.json();
    if (!file_url || !file_name || !client_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const folders = await base44.asServiceRole.entities.DriveFolder.filter({ client_email });
    let record = folders[0];
    let clientFolderId = record?.folder_id || null;

    const folderStillExists = await driveFolderExists(clientFolderId, authHeader);

    if (!record || !folderStillExists) {
      clientFolderId = await createDriveFolder(client_email, null, authHeader);

      if (!record) {
        record = await base44.asServiceRole.entities.DriveFolder.create({
          client_email,
          folder_id: clientFolderId,
          folder_name: client_email,
          category_folders: {},
        });
      } else {
        record = await base44.asServiceRole.entities.DriveFolder.update(record.id, {
          folder_id: clientFolderId,
          folder_name: client_email,
          category_folders: {},
        });
      }
    }

    const targetFolderId = clientFolderId;

    const fileRes = await fetch(file_url);
    const fileBlob = await fileRes.blob();
    const mimeType = fileBlob.type || 'application/octet-stream';

    const metadata = { name: file_name, parents: [targetFolderId] };
    const boundary = 'boundary_' + Date.now();
    const metadataPart = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const filePart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const enc = new TextEncoder();
    const metaBytes = enc.encode(metadataPart);
    const filePartBytes = enc.encode(filePart);
    const endBytes = enc.encode(endPart);
    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());

    const body = new Uint8Array(metaBytes.length + filePartBytes.length + fileBytes.length + endBytes.length);
    let offset = 0;
    body.set(metaBytes, offset); offset += metaBytes.length;
    body.set(filePartBytes, offset); offset += filePartBytes.length;
    body.set(fileBytes, offset); offset += fileBytes.length;
    body.set(endBytes, offset);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });

    const uploaded = await uploadRes.json();
    if (!uploadRes.ok) {
      return Response.json({ error: 'Drive upload failed', details: uploaded }, { status: 500 });
    }

    return Response.json({ success: true, drive_file_id: uploaded.id, folder_id: clientFolderId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
