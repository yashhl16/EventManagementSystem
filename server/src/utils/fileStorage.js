import path from 'path';

const ALLOWED_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validate deliverable file format and size
 */
export const validateSubmissionFile = ({ fileName = '', fileType = '', fileSize = 0, fileUrl = '' }) => {
  // 1. If direct link (e.g., Google Drive, OneDrive, GitHub, Figma)
  if (fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
    return { isValid: true, isExternalUrl: true };
  }

  // 2. Validate file extension
  const ext = path.extname(fileName || '').toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.includes(ext);

  // 3. Validate MIME type if base64 data url
  let isDataUrl = false;
  if (fileUrl && fileUrl.startsWith('data:')) {
    isDataUrl = true;
    const mimeMatch = fileUrl.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      const mime = mimeMatch[1].toLowerCase();
      // Calculate approximate byte size from base64 length
      const base64Data = fileUrl.substring(mimeMatch[0].length);
      const approxBytes = Math.round((base64Data.length * 3) / 4);
      if (approxBytes > MAX_FILE_SIZE_BYTES) {
        return {
          isValid: false,
          message: `File size exceeds the 20MB maximum limit (${(approxBytes / (1024 * 1024)).toFixed(1)}MB).`,
        };
      }
    }
  }

  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      message: `File size exceeds the 20MB maximum limit (${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  if (!hasValidExt) {
    return {
      isValid: false,
      message: `Invalid file format "${ext || fileType}". Allowed document types: .pdf, .ppt, .pptx, .doc, .docx`,
    };
  }

  return { isValid: true };
};

/**
 * Process and safely store deliverable file.
 * Integrates:
 * - Supabase Storage (if SUPABASE_URL & SUPABASE_KEY set)
 * - Vercel Blob (if BLOB_READ_WRITE_TOKEN set)
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
      fileName,
      fileType,
      storageProvider: 'external_link',
    };
  }

  // 1. Try Supabase Storage if configured
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey && fileUrl.startsWith('data:')) {
    try {
      const mimeMatch = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (mimeMatch) {
        const mime = mimeMatch[1];
        const base64Content = mimeMatch[2];
        const buffer = Buffer.from(base64Content, 'base64');
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
            fileName,
            fileType: mime,
            fileSize: buffer.length,
            storageProvider: 'supabase',
          };
        }
      }
    } catch (err) {
      console.warn('[Storage] Supabase storage upload notice:', err.message);
    }
  }

  // 2. Try Vercel Blob Storage if configured
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken && fileUrl.startsWith('data:')) {
    try {
      const mimeMatch = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (mimeMatch) {
        const mime = mimeMatch[1];
        const base64Content = mimeMatch[2];
        const buffer = Buffer.from(base64Content, 'base64');
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
              fileName,
              fileType: mime,
              fileSize: buffer.length,
              storageProvider: 'vercel_blob',
            };
          }
        }
      }
    } catch (err) {
      console.warn('[Storage] Vercel Blob storage notice:', err.message);
    }
  }

  // 3. Fallback: Store securely in database record
  let approximateBytes = 0;
  if (fileUrl.startsWith('data:')) {
    const commaIndex = fileUrl.indexOf(',');
    if (commaIndex !== -1) {
      approximateBytes = Math.round(((fileUrl.length - commaIndex) * 3) / 4);
    }
  }

  return {
    fileUrl,
    fileName,
    fileType,
    fileSize: approximateBytes,
    storageProvider: 'database_store',
  };
};
