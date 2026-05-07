# Music Web API Documentation

This document describes all available API endpoints for the Music Web application.

## Base URL
```
http://localhost:3000/api
```

---

## Endpoints

### 1. Search
**Endpoint:** `/api/search`
**Method:** `GET`
**Description:** Search for tracks, artists, and albums

**Query Parameters:**
- `q` (required): Search query string

**Example Request:**
```bash
GET /api/search?q=beatles
```

**Response:**
```json
{
  "tracks": [
    {
      "id": "123456",
      "name": "Come Together",
      "artists": [{ "id": "789", "name": "The Beatles" }],
      "album": {
        "id": "456",
        "name": "Abbey Road",
        "images": [{ "url": "..." }],
        "release_date": "1969-09-26",
        "artists": [...]
      },
      "duration_ms": 259000,
      "preview_url": "https://...",
      "artworkUrl": "https://...",
      "youtubeId": "video_id_here"
    }
  ],
  "artists": [
    {
      "id": "789",
      "name": "The Beatles",
      "genre": "Rock",
      "artworkUrl": "https://..."
    }
  ],
  "albums": [
    {
      "id": "456",
      "name": "Abbey Road",
      "artists": [{ "id": "789", "name": "The Beatles" }],
      "artworkUrl": "https://...",
      "release_date": "1969-09-26",
      "trackCount": 17
    }
  ]
}
```

---

### 2. Search Suggestions
**Endpoint:** `/api/search/suggestions`
**Method:** `GET`
**Description:** Get search suggestions for autocomplete

**Query Parameters:**
- `q` (required): Search query string

**Example Request:**
```bash
GET /api/search/suggestions?q=beat
```

**Response:**
```json
{
  "suggestions": [
    { "type": "track", "id": "123", "name": "Beat It", "subtitle": "Michael Jackson" },
    { "type": "artist", "id": "456", "name": "The Beatles", "subtitle": "Rock" },
    { "type": "album", "id": "789", "name": "Beatles 1", "subtitle": "The Beatles" }
  ]
}
```

---

### 3. Track Details
**Endpoint:** `/api/track/[id]`
**Method:** `GET`
**Description:** Get detailed information about a specific track

**Path Parameters:**
- `id` (required): Track ID

**Example Request:**
```bash
GET /api/track/123456
```

**Response:**
```json
{
  "id": "123456",
  "name": "Come Together",
  "artists": [{ "id": "789", "name": "The Beatles" }],
  "album": {
    "id": "456",
    "name": "Abbey Road",
    "images": [{ "url": "..." }],
    "release_date": "1969-09-26",
    "artists": [...]
  },
  "duration_ms": 259000,
  "preview_url": "https://...",
  "artworkUrl": "https://...",
  "youtubeId": "video_id_here"
}
```

---

### 4. Artist Details
**Endpoint:** `/api/artist/[id]`
**Method:** `GET`
**Description:** Get artist information, top tracks, and albums

**Path Parameters:**
- `id` (required): Artist ID

**Example Request:**
```bash
GET /api/artist/789
```

**Response:**
```json
{
  "artist": {
    "id": "789",
    "name": "The Beatles",
    "genre": "Rock",
    "artworkUrl": "https://..."
  },
  "topTracks": [
    {
      "id": "123",
      "name": "Come Together",
      "artists": [...],
      "album": {...},
      "duration_ms": 259000,
      "preview_url": "https://...",
      "artworkUrl": "https://..."
    }
  ],
  "albums": [
    {
      "id": "456",
      "name": "Abbey Road",
      "artists": [...],
      "artworkUrl": "https://...",
      "release_date": "1969-09-26",
      "trackCount": 17
    }
  ]
}
```

---

### 5. Album Details
**Endpoint:** `/api/album/[id]`
**Method:** `GET`
**Description:** Get album information and all tracks

**Path Parameters:**
- `id` (required): Album ID

**Example Request:**
```bash
GET /api/album/456
```

**Response:**
```json
{
  "id": "456",
  "name": "Abbey Road",
  "artists": [{ "id": "789", "name": "The Beatles" }],
  "artworkUrl": "https://...",
  "release_date": "1969-09-26",
  "trackCount": 17,
  "tracks": [
    {
      "id": "123",
      "name": "Come Together",
      "artists": [...],
      "album": {...},
      "duration_ms": 259000,
      "preview_url": "https://...",
      "artworkUrl": "https://...",
      "youtubeId": "video_id_here"
    }
  ]
}
```

---

### 6. Top Tracks
**Endpoint:** `/api/top-tracks`
**Method:** `GET`
**Description:** Get trending/top tracks

**Example Request:**
```bash
GET /api/top-tracks
```

**Response:**
```json
{
  "tracks": [
    {
      "id": "123",
      "name": "Blinding Lights",
      "artists": [{ "id": "456", "name": "The Weeknd" }],
      "album": {...},
      "duration_ms": 200000,
      "preview_url": "https://...",
      "artworkUrl": "https://...",
      "youtubeId": "video_id_here"
    }
  ]
}
```

---

## Data Types

### ItunesTrack
```typescript
{
  id: string;
  name: string;
  artists: ItunesArtistRef[];
  album: ItunesAlbumRef;
  duration_ms: number;
  preview_url: string | null;
  artworkUrl: string;
}
```

### ItunesArtist
```typescript
{
  id: string;
  name: string;
  genre: string;
  artworkUrl: string;
}
```

### ItunesAlbum
```typescript
{
  id: string;
  name: string;
  artists: ItunesArtistRef[];
  artworkUrl: string;
  release_date: string;
  trackCount: number;
}
```

### EnrichedTrack (extends ItunesTrack)
```typescript
{
  ...ItunesTrack,
  youtubeId?: string;
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Missing query"
}
```

**404 Not Found:**
```json
{
  "error": "Track not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Error message details"
}
```

---

## Notes

- All track endpoints include YouTube video IDs when available
- Images are returned in high resolution (600x600)
- API responses are cached for 5 minutes (300 seconds)
- All IDs are strings to ensure consistency
