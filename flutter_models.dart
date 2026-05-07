// Flutter/Dart models for Music App
// Based on the TypeScript types from the music-web app

class ItunesArtistRef {
  final String id;
  final String name;

  ItunesArtistRef({required this.id, required this.name});

  factory ItunesArtistRef.fromJson(Map<String, dynamic> json) {
    return ItunesArtistRef(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
    };
  }
}

class ItunesAlbumRef {
  final String id;
  final String name;
  final List<ImageUrl> images;
  final String releaseDate;
  final List<ItunesArtistRef> artists;

  ItunesAlbumRef({
    required this.id,
    required this.name,
    required this.images,
    required this.releaseDate,
    required this.artists,
  });

  factory ItunesAlbumRef.fromJson(Map<String, dynamic> json) {
    return ItunesAlbumRef(
      id: json['id'] as String,
      name: json['name'] as String,
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => ImageUrl.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      releaseDate: json['release_date'] as String? ?? '',
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtistRef.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'images': images.map((e) => e.toJson()).toList(),
      'release_date': releaseDate,
      'artists': artists.map((e) => e.toJson()).toList(),
    };
  }
}

class ImageUrl {
  final String url;

  ImageUrl({required this.url});

  factory ImageUrl.fromJson(Map<String, dynamic> json) {
    return ImageUrl(url: json['url'] as String);
  }

  Map<String, dynamic> toJson() {
    return {'url': url};
  }
}

class ItunesTrack {
  final String id;
  final String name;
  final List<ItunesArtistRef> artists;
  final ItunesAlbumRef album;
  final int durationMs;
  final String? previewUrl;
  final String artworkUrl;

  ItunesTrack({
    required this.id,
    required this.name,
    required this.artists,
    required this.album,
    required this.durationMs,
    this.previewUrl,
    required this.artworkUrl,
  });

  factory ItunesTrack.fromJson(Map<String, dynamic> json) {
    return ItunesTrack(
      id: json['id'] as String,
      name: json['name'] as String,
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtistRef.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      album: ItunesAlbumRef.fromJson(json['album'] as Map<String, dynamic>),
      durationMs: json['duration_ms'] as int? ?? 0,
      previewUrl: json['preview_url'] as String?,
      artworkUrl: json['artworkUrl'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'artists': artists.map((e) => e.toJson()).toList(),
      'album': album.toJson(),
      'duration_ms': durationMs,
      'preview_url': previewUrl,
      'artworkUrl': artworkUrl,
    };
  }
}

class ItunesArtist {
  final String id;
  final String name;
  final String genre;
  final String artworkUrl;

  ItunesArtist({
    required this.id,
    required this.name,
    required this.genre,
    required this.artworkUrl,
  });

  factory ItunesArtist.fromJson(Map<String, dynamic> json) {
    return ItunesArtist(
      id: json['id'] as String,
      name: json['name'] as String,
      genre: json['genre'] as String? ?? '',
      artworkUrl: json['artworkUrl'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'genre': genre,
      'artworkUrl': artworkUrl,
    };
  }
}

class ItunesAlbum {
  final String id;
  final String name;
  final List<ItunesArtistRef> artists;
  final String artworkUrl;
  final String releaseDate;
  final int trackCount;

  ItunesAlbum({
    required this.id,
    required this.name,
    required this.artists,
    required this.artworkUrl,
    required this.releaseDate,
    required this.trackCount,
  });

  factory ItunesAlbum.fromJson(Map<String, dynamic> json) {
    return ItunesAlbum(
      id: json['id'] as String,
      name: json['name'] as String,
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtistRef.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      artworkUrl: json['artworkUrl'] as String,
      releaseDate: json['release_date'] as String? ?? '',
      trackCount: json['trackCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'artists': artists.map((e) => e.toJson()).toList(),
      'artworkUrl': artworkUrl,
      'release_date': releaseDate,
      'trackCount': trackCount,
    };
  }
}

class ItunesSearchResult {
  final List<ItunesTrack> tracks;
  final List<ItunesArtist> artists;
  final List<ItunesAlbum> albums;

  ItunesSearchResult({
    required this.tracks,
    required this.artists,
    required this.albums,
  });

  factory ItunesSearchResult.fromJson(Map<String, dynamic> json) {
    return ItunesSearchResult(
      tracks: (json['tracks'] as List<dynamic>?)
              ?.map((e) => ItunesTrack.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtist.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      albums: (json['albums'] as List<dynamic>?)
              ?.map((e) => ItunesAlbum.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tracks': tracks.map((e) => e.toJson()).toList(),
      'artists': artists.map((e) => e.toJson()).toList(),
      'albums': albums.map((e) => e.toJson()).toList(),
    };
  }
}

class EnrichedTrack extends ItunesTrack {
  final String? youtubeId;

  EnrichedTrack({
    required super.id,
    required super.name,
    required super.artists,
    required super.album,
    required super.durationMs,
    super.previewUrl,
    required super.artworkUrl,
    this.youtubeId,
  });

  factory EnrichedTrack.fromJson(Map<String, dynamic> json) {
    return EnrichedTrack(
      id: json['id'] as String,
      name: json['name'] as String,
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtistRef.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      album: ItunesAlbumRef.fromJson(json['album'] as Map<String, dynamic>),
      durationMs: json['duration_ms'] as int? ?? 0,
      previewUrl: json['preview_url'] as String?,
      artworkUrl: json['artworkUrl'] as String,
      youtubeId: json['youtubeId'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final json = super.toJson();
    json['youtubeId'] = youtubeId;
    return json;
  }
}

// API Response Models
class TrackDetailResponse extends EnrichedTrack {
  TrackDetailResponse({
    required super.id,
    required super.name,
    required super.artists,
    required super.album,
    required super.durationMs,
    super.previewUrl,
    required super.artworkUrl,
    super.youtubeId,
  });

  factory TrackDetailResponse.fromJson(Map<String, dynamic> json) {
    return TrackDetailResponse(
      id: json['id'] as String,
      name: json['name'] as String,
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtistRef.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      album: ItunesAlbumRef.fromJson(json['album'] as Map<String, dynamic>),
      durationMs: json['duration_ms'] as int? ?? 0,
      previewUrl: json['preview_url'] as String?,
      artworkUrl: json['artworkUrl'] as String,
      youtubeId: json['youtubeId'] as String?,
    );
  }
}

class ArtistDetailResponse {
  final ItunesArtist artist;
  final List<ItunesTrack> topTracks;
  final List<ItunesAlbum> albums;

  ArtistDetailResponse({
    required this.artist,
    required this.topTracks,
    required this.albums,
  });

  factory ArtistDetailResponse.fromJson(Map<String, dynamic> json) {
    return ArtistDetailResponse(
      artist: ItunesArtist.fromJson(json['artist'] as Map<String, dynamic>),
      topTracks: (json['topTracks'] as List<dynamic>?)
              ?.map((e) => ItunesTrack.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      albums: (json['albums'] as List<dynamic>?)
              ?.map((e) => ItunesAlbum.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'artist': artist.toJson(),
      'topTracks': topTracks.map((e) => e.toJson()).toList(),
      'albums': albums.map((e) => e.toJson()).toList(),
    };
  }
}

class AlbumDetailResponse {
  final String id;
  final String name;
  final List<ItunesArtistRef> artists;
  final String artworkUrl;
  final String releaseDate;
  final int trackCount;
  final List<EnrichedTrack> tracks;

  AlbumDetailResponse({
    required this.id,
    required this.name,
    required this.artists,
    required this.artworkUrl,
    required this.releaseDate,
    required this.trackCount,
    required this.tracks,
  });

  factory AlbumDetailResponse.fromJson(Map<String, dynamic> json) {
    return AlbumDetailResponse(
      id: json['id'] as String,
      name: json['name'] as String,
      artists: (json['artists'] as List<dynamic>?)
              ?.map((e) => ItunesArtistRef.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      artworkUrl: json['artworkUrl'] as String,
      releaseDate: json['release_date'] as String? ?? '',
      trackCount: json['trackCount'] as int? ?? 0,
      tracks: (json['tracks'] as List<dynamic>?)
              ?.map((e) => EnrichedTrack.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'artists': artists.map((e) => e.toJson()).toList(),
      'artworkUrl': artworkUrl,
      'release_date': releaseDate,
      'trackCount': trackCount,
      'tracks': tracks.map((e) => e.toJson()).toList(),
    };
  }
}

class TopTracksResponse {
  final List<EnrichedTrack> tracks;

  TopTracksResponse({required this.tracks});

  factory TopTracksResponse.fromJson(Map<String, dynamic> json) {
    return TopTracksResponse(
      tracks: (json['tracks'] as List<dynamic>?)
              ?.map((e) => EnrichedTrack.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tracks': tracks.map((e) => e.toJson()).toList(),
    };
  }
}

class SearchSuggestion {
  final String type;
  final String id;
  final String name;
  final String subtitle;

  SearchSuggestion({
    required this.type,
    required this.id,
    required this.name,
    required this.subtitle,
  });

  factory SearchSuggestion.fromJson(Map<String, dynamic> json) {
    return SearchSuggestion(
      type: json['type'] as String,
      id: json['id'] as String,
      name: json['name'] as String,
      subtitle: json['subtitle'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'id': id,
      'name': name,
      'subtitle': subtitle,
    };
  }
}

class SearchSuggestionsResponse {
  final List<SearchSuggestion> suggestions;

  SearchSuggestionsResponse({required this.suggestions});

  factory SearchSuggestionsResponse.fromJson(Map<String, dynamic> json) {
    return SearchSuggestionsResponse(
      suggestions: (json['suggestions'] as List<dynamic>?)
              ?.map((e) => SearchSuggestion.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'suggestions': suggestions.map((e) => e.toJson()).toList(),
    };
  }
}
