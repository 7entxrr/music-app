# Flutter App Update Instructions

Update the Flutter app to take advantage of the new backend API optimizations.

## 1. Use the New Batch YouTube Endpoint

Replace individual YouTube API calls with the new batch endpoint to reduce network requests.

**New Endpoint:** `POST /api/youtube/batch`

**Request Body:**
```json
{
  "tracks": [
    { "artist": "Artist Name", "track": "Track Name" },
    { "artist": "Another Artist", "track": "Another Track" }
  ]
}
```

**Response:**
```json
{
  "results": [
    { "artist": "Artist Name", "track": "Track Name", "youtubeId": "abc123" },
    { "artist": "Another Artist", "track": "Another Track", "youtubeId": "def456" }
  ]
}
```

**Implementation:**
- Create a function `fetchYouTubeIdsBatch(List<Track> tracks)` that batches up to 5-10 tracks per request
- Replace the existing parallel `getYouTubeVideoId` calls with this batch endpoint
- The backend processes 5 requests at a time internally, so you can send larger batches

## 2. Respect HTTP Cache Headers

The backend now returns proper cache headers. Configure your HTTP client to respect them:

- `Cache-Control: public, s-maxage=X, stale-while-revalidate=Y`
- `ETag` headers for conditional requests (304 responses)

**Implementation:**
- Enable caching in your HTTP client (dio/http package)
- Store and send `If-None-Match` headers with ETags from previous responses
- Handle 304 responses by returning cached data

## 3. Leverage In-Memory Caching

The backend has aggressive caching. Reduce redundant requests on the Flutter side:

- Cache top tracks locally (they change rarely)
- Cache artist/album details
- Implement a simple in-memory cache with TTL (5-10 minutes)

## 4. Update Audio URL Fetching

The audio endpoint now uses youtubei.js (much faster) and has in-flight deduplication.

**No changes needed** - your existing implementation will benefit automatically, but you can:
- Reduce timeout values (fetches are now ~300ms instead of ~1.5s)
- Add retry logic for failed requests (backend has deduplication so retries are safe)

## 5. Pre-fetch Strategy

The backend pre-warms the audio cache on server start. Complement this on the Flutter side:

- Pre-fetch audio URLs for the first 5-10 tracks when the app launches
- Use the batch YouTube endpoint for efficient pre-fetching
- Implement progressive loading (show UI immediately, fetch audio in background)

## 6. Error Handling Improvements

With the new optimizations, update error handling:

- Implement exponential backoff for retries
- Cache failed requests to avoid repeated failures
- Show cached data when network is slow (stale-while-revalidate)

## 7. Performance Monitoring

Add logging to measure improvements:

- Track API response times before/after changes
- Monitor cache hit rates
- Measure batch endpoint performance vs individual calls

## Expected Performance Improvements

- YouTube lookups: ~60-70% faster with batching
- Audio URL fetches: ~80% faster (youtubei.js vs yt-dlp)
- Reduced network overhead with caching
- Better UX with stale-while-revalidate

## Files to Update

- `lib/services/youtube_service.dart` - Add batch endpoint support
- `lib/services/audio_service.dart` - Update timeouts, add retry logic
- `lib/models/track.dart` - Ensure it has artist/track fields for batching
- `lib/cache/cache_manager.dart` - Implement HTTP cache header support
- Any files calling `getYouTubeVideoId` - Replace with batch calls
