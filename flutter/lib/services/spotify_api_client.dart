import 'dart:convert';
import 'dart:developer' as dev;

import 'package:http/http.dart' as http;

import 'spotify_token_service.dart';

/// Thin Spotify Web API client.
///
/// All requests are authenticated via [SpotifyTokenService].
/// A single 401 triggers a token refresh and one automatic retry.
/// The Flutter app never talks to Spotify directly for auth.
class SpotifyApiClient {
  SpotifyApiClient._();
  static final SpotifyApiClient instance = SpotifyApiClient._();

  static const _base = 'https://api.spotify.com/v1';

  // ── public API ────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> get(String path) => _request(path);

  // ── internals ─────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> _request(
    String path, {
    bool retried = false,
  }) async {
    final token = await SpotifyTokenService.instance.getToken();

    dev.log('GET $path', name: 'SpotifyApi');
    final res = await http.get(
      Uri.parse('$_base$path'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (res.statusCode == 401 && !retried) {
      dev.log('401 on $path — refreshing token and retrying', name: 'SpotifyApi');
      await SpotifyTokenService.instance.handleUnauthorized();
      return _request(path, retried: true);
    }

    if (res.statusCode != 200) {
      dev.log('Error ${res.statusCode} on $path: ${res.body}', name: 'SpotifyApi');
      throw Exception('Spotify API error ${res.statusCode}: $path');
    }

    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
