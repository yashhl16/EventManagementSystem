/**
 * Utilities for safely resolving deliverable filenames and downloading/viewing
 * submission files (including base64 `data:` URIs converted into Blob URLs).
 */

const MIME_TO_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const extractMimeFromDataUri = (dataUri?: string): string | undefined => {
  if (!dataUri || !dataUri.startsWith('data:')) return undefined;
  const header = dataUri.slice(0, dataUri.indexOf(',') === -1 ? dataUri.length : dataUri.indexOf(','));
  const mimeMatch = header.match(/^data:([^;]+)/i);
  return mimeMatch?.[1]?.trim().toLowerCase();
};

const inferExtension = (mimeOrType?: string): string | undefined => {
  if (!mimeOrType) return undefined;
  const normalized = mimeOrType.trim().toLowerCase();
  if (MIME_TO_EXTENSION[normalized]) {
    return MIME_TO_EXTENSION[normalized];
  }
  const clean = normalized.replace(/^\./, '');
  if (/^[a-z0-9]{2,5}$/.test(clean)) {
    return clean;
  }
  return undefined;
};

const appendMissingExtension = (name: string, extension?: string): string => {
  if (!extension) return name;
  if (/\.[a-z0-9]{2,6}$/i.test(name)) return name;
  return `${name}.${extension}`;
};

/**
 * Resolves a clean display/download filename for a submission deliverable without
 * exposing raw base64 `data:` URIs when `fileName` is omitted.
 */
export const resolveSubmissionFileName = (
  fileName?: string,
  fileUrl?: string,
  fileType?: string,
  fallbackTitle?: string
): string => {
  const mime = extractMimeFromDataUri(fileUrl) || fileType;
  const extension = inferExtension(mime);

  const trimmedName = fileName?.trim();
  if (trimmedName && !trimmedName.startsWith('data:')) {
    return appendMissingExtension(trimmedName, extension);
  }

  if (fileUrl && !fileUrl.startsWith('data:')) {
    const rawSegment = fileUrl.split('/').pop()?.split('?')[0]?.trim();
    if (rawSegment) {
      try {
        return appendMissingExtension(decodeURIComponent(rawSegment), extension);
      } catch {
        return appendMissingExtension(rawSegment, extension);
      }
    }
  }

  const sanitizedTitle = (fallbackTitle || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, '-');

  const baseName = sanitizedTitle || 'submission-file';
  return appendMissingExtension(baseName, extension);
};

/**
 * Converts `data:` base64/text URIs into Blob object URLs before triggering a
 * download, or opens external HTTP/HTTPS links in a new tab.
 */
export const handleDownloadOrView = (
  fileUrl?: string,
  fileName: string = 'submission-file',
  fileType?: string
): void => {
  if (!fileUrl) return;

  if (fileUrl.startsWith('data:')) {
    const commaIndex = fileUrl.indexOf(',');
    if (commaIndex === -1) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const meta = fileUrl.slice(0, commaIndex);
    const payload = fileUrl.slice(commaIndex + 1);
    const mimeMatch = meta.match(/^data:([^;]+)/i);
    const mime = mimeMatch?.[1]?.trim() || fileType || 'application/octet-stream';
    const isBase64 = /;base64/i.test(meta);
    const finalFileName = resolveSubmissionFileName(fileName, fileUrl, mime);

    try {
      let blob: Blob;
      if (isBase64) {
        const cleanBase64 = payload.replace(/\s/g, '');
        const bstr = atob(cleanBase64);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        blob = new Blob([decodeURIComponent(payload)], { type: mime });
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    } catch {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  window.open(fileUrl, '_blank', 'noopener,noreferrer');
};
