import 'dart:async';
import 'dart:convert';
import 'dart:developer' as dev;

import 'package:http/http.dart' as http;

/// Manages a Spotify access token sourced from the backend.
///
/// - Caches the token in memory with its expiry timestamp.
/// - Proactively fetches a new token 60 s before expiry.
/// - Deduplicates concurrent [getToken] calls with a single in-flight request.
/// - Call [handleUnauthorized] when Spotify returns 401 to force a refresh.
class SpotifyTokenService {
  SpotifyTokenService._();
  static final SpotifyTokenService instance = SpotifyTokenService._();

  // ── config ────────────────────────────────────────────────────────────────

  /// Base URL of your Next.js backend. Override for production.
  static String backendBase = 'http://localhost:3000';

  // ── state ─────────────────────────────────────────────────────────────────

  String? _token;
  DateTime? _expiresAt;
  Timer? _proactiveTimer;
  Completer<String>? _inflight;

  // ── public API ────────────────────────────────────────────────────────────

  /// Returns a valid access token, refreshing transparently when needed.
  Future<String> getToken() async {
    if (_isValid()) return _token!;
    return _fetch();
  }

  /// Call this when any Spotify API responds with 401.
  /// Invalidates the cached token and fetches a fresh one immediately.
  Future<String> handleUnauthorized() async {
    dev.log('401 received — forcing token refresh', name: 'SpotifyToken');
    _invalidate();
    return _fetch(force: true);
  }

  void dispose() {
    _proactiveTimer?.cancel();
  }

  // ── internals ─────────────────────────────────────────────────────────────

  bool _isValid() =>
      _token != null &&
      _expiresAt != null &&
      DateTime.now().isBefore(_expiresAt!);

  void _invalidate() {
    _token = null;
    _expiresAt = null;
    _proactiveTimer?.cancel();
    _proactiveTimer = null;
  }

  Future<String> _fetch({bool force = false}) async {
    // Deduplicate: if a request is already in flight, wait for it.
    if (_inflight != null) {
      dev.log('Token fetch already in flight — waiting', name: 'SpotifyToken');
      return _inflight!.future;
    }

    final completer = Completer<String>();
    _inflight = completer;

    try {
      final url = Uri.parse(
        '$backendBase/api/spotify/token${force ? '?force=1' : ''}',
      );

      dev.log('Requesting token from backend', name: 'SpotifyToken');
      final response = await http.get(url);

      if (response.statusCode != 200) {
        final msg = 'Backend token error ${response.statusCode}: ${response.body}';
        dev.log(msg, name: 'SpotifyToken');
        throw Exception(msg);
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      _token = data['access_token'] as String;
      final expiresIn = (data['expires_in'] as num).toInt();
      _expiresAt = DateTime.now().add(Duration(seconds: expiresIn));

      dev.log(
        'Token ${force ? 'refreshed' : 'created'} — expires in ${expiresIn}s',
        name: 'SpotifyToken',
      );

      _scheduleProactiveRefresh(expiresIn);
      completer.complete(_token);
      return _token!;
    } catch (e, st) {
      dev.log('Token fetch failed: $e', name: 'SpotifyToken', error: e, stackTrace: st);
      completer.completeError(e, st);
      rethrow;
    } finally {
      _inflight = null;
    }
  }

  void _scheduleProactiveRefresh(int expiresIn) {
    _proactiveTimer?.cancel();
    final delay = expiresIn - 60;
    if (delay <= 0) return;

    dev.log('Proactive refresh scheduled in ${delay}s', name: 'SpotifyToken');
    _proactiveTimer = Timer(Duration(seconds: delay), () {
      dev.log('Proactive refresh triggered', name: 'SpotifyToken');
      _invalidate();
      _fetch(); // fire and forget — next getToken() call will also trigger it
    });
  }
}
