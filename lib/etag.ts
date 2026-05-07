import { createHash } from 'crypto';

// Generate ETag from data
export function generateETag(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return createHash('md5').update(str).digest('hex');
}

// Check if ETag matches
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch === etag || ifNoneMatch === `W/"${etag}"`;
}
