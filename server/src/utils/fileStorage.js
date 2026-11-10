import path from 'path';
import fs from 'fs';

const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validate deliverable file format and size
 */
export const validateSubmissionFile = ({ fileName = '', fileType = '', fileSize = 0, fileUrl = '' }) => {
  // 1. If direct external link (e.g., Google Drive, OneDrive, GitHub, Figma)
  if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
    return { isValid: true, isExternalUrl: true };
  }

  // 2. Validate file size if base64 data URL
  if (fileUrl && fileUrl.startsWith('data:')) {
    const commaIndex = fileUrl.indexOf(',');
    if (commaIndex !== -1) {
      const base64Len = fileUrl.length - (commaIndex + 1);
      const approxBytes = Math.round((base64Len * 3) / 4);
      if (approxBytes > MAX_FILE_SIZE_BYTES) {
        return {
          isValid: false,
          message: `File size exceeds the 25MB maximum limit (${(approxBytes / (1024 * 1024)).toFixed(1)}MB).`,
        };
      }
    }
  }

  // 3. Validate explicit fileSize parameter
  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      message: `File size exceeds the 25MB maximum limit (${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  // 4. Validate file extension
  const ext = path.extname(fileName || '').toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);

  if (ext) {
    if (!hasValidExt) {
      return {
        isValid: false,
        message: `Invalid file format "${ext || fileType}". Allowed document types: .pdf, .ppt, .pptx, .doc, .docx`,
      };
    }
  } else {
    // If no extension, ensure MIME type is an explicit allowed document type
    const DOCUMENT_MIME_TYPES = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const normalizedMime = (fileType || '').toLowerCase().trim();
    const hasValidDocMime = DOCUMENT_MIME_TYPES.some((m) => normalizedMime.includes(m) || m.includes(normalizedMime));
    if (!hasValidDocMime) {
      return {
        isValid: false,
        message: `Invalid file format "${ext || fileType}". Allowed document types: .pdf, .ppt, .pptx, .doc, .docx`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Process and safely store deliverable file.
 * Integrates:
 * - Supabase Storage (if SUPABASE_URL & SUPABASE_KEY set)
 * - Vercel Blob (if BLOB_READ_WRITE_TOKEN set)
 * - Local Public Disk Storage (persists in public/uploads/deliverables)
 * - Safe data/local URL fallback
 */
export const storeDeliverableFile = async ({
  fileName = 'deliverable.pdf',
  fileType = 'application/pdf',
  fileUrl = '',
  eventId,
  teamId,
}) => {
  // If already an HTTP/HTTPS URL, preserve directly
  if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
    return {
      fileUrl,
      documentUrl: fileUrl,
      fileName,
      fileType: (fileType || 'application/octet-stream').slice(0, 255),
      storageProvider: 'external_link',
    };
  }

  let mime = (fileType || 'application/octet-stream').slice(0, 255);
  let buffer = null;

  if (fileUrl && fileUrl.startsWith('data:')) {
    const commaIndex = fileUrl.indexOf(',');
    if (commaIndex !== -1) {
      const header = fileUrl.substring(5, commaIndex);
      const parsedMime = header.split(';')[0];
      if (parsedMime) {
        mime = parsedMime.slice(0, 255);
      }
      const base64Data = fileUrl.substring(commaIndex + 1);
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch (bufErr) {
        console.error('Buffer decoding error for deliverable file:', bufErr);
        throw new Error('Failed to parse uploaded document file buffer.');
      }
    }
  }

  // 1. Try Supabase Storage if configured
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey && buffer) {
    try {
      const safeName = `${eventId}/${teamId || 'individual'}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadEndpoint = `${supabaseUrl}/storage/v1/object/event-submissions/${safeName}`;
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': mime,
          'x-upsert': 'true',
        },
        body: buffer,
      });

      if (response.ok) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/event-submissions/${safeName}`;
        return {
          fileUrl: publicUrl,
          documentUrl: publicUrl,
          fileName,
          fileType: mime,
          fileSize: buffer.length,
          storageProvider: 'supabase',
        };
      }
    } catch (err) {
      console.warn('[Storage] Supabase storage upload notice:', err.message);
    }
  }

  // 2. Try Vercel Blob Storage if configured
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken && buffer) {
    try {
      const safePath = `submissions/${eventId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const blobResponse = await fetch(`https://blob.vercel-storage.com/${safePath}`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${blobToken}`,
          'x-api-version': '7',
          'content-type': mime,
        },
        body: buffer,
      });

      if (blobResponse.ok) {
        const blobData = await blobResponse.json();
        if (blobData?.url) {
          return {
            fileUrl: blobData.url,
            documentUrl: blobData.url,
            fileName,
            fileType: mime,
            fileSize: buffer.length,
            storageProvider: 'vercel_blob',
          };
        }
      }
    } catch (err) {
      console.warn('[Storage] Vercel Blob storage notice:', err.message);
    }
  }

  // 3. Try Local Disk Storage (local dev and standard Node server)
  if (buffer) {
    try {
      const safeName = `${Date.now()}_${(fileName || 'deliverable.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadDir = path.resolve(process.cwd(), 'server', 'public', 'uploads', 'deliverables');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFilePath = path.join(uploadDir, safeName);
      fs.writeFileSync(localFilePath, buffer);
      const localUrl = `/uploads/deliverables/${safeName}`;
      return {
        fileUrl: localUrl,
        documentUrl: localUrl,
        fileName,
        fileType: mime,
        fileSize: buffer.length,
        storageProvider: 'local_storage',
      };
    } catch (fsErr) {
      console.warn('[Storage] Local disk save fallback notice:', fsErr.message);
    }
  }

  // 4. Fallback: Store securely as data URL in database record
  let approximateBytes = buffer ? buffer.length : 0;
  if (!approximateBytes && fileUrl.startsWith('data:')) {
    const commaIndex = fileUrl.indexOf(',');
    if (commaIndex !== -1) {
      approximateBytes = Math.round(((fileUrl.length - commaIndex) * 3) / 4);
    }
  }

  return {
    fileUrl,
    documentUrl: fileUrl,
    fileName,
    fileType: mime,
    fileSize: approximateBytes,
    storageProvider: 'database_store',
  };
};
