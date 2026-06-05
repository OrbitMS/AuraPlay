import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { SourceTrack } from './playlistImport';

/**
 * Spotify OAuth (Authorization Code + PKCE — no client secret).
 * Requires a user-supplied Client ID from a Spotify app whose redirect URI
 * is set to http://127.0.0.1:14565/callback.
 * Enables importing the user's PRIVATE playlists.
 */

const PORT = 14565;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = 'playlist-read-private playlist-read-collaborative';
const TOKEN_KEY = 'auraplay_spotify_token';
const CLIENT_KEY = 'auraplay_spotify_client';

interface TokenData { clientId: string; access: string; refresh: string; expiresAt: number; }

export function getClientId(): string { return localStorage.getItem(CLIENT_KEY) ?? ''; }
export function setClientId(id: string) { localStorage.setItem(CLIENT_KEY, id.trim()); }

function loadToken(): TokenData | null {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null'); } catch { return null; }
}
function saveToken(t: TokenData) { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); }

export function isSpotifyConnected(): boolean { return !!loadToken(); }
export function disconnectSpotify() { localStorage.removeItem(TOKEN_KEY); }

/* ── PKCE helpers ── */
function randomBytesB64Url(len: number): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return b64url(a.buffer);
}
function b64url(buf: ArrayBuffer): string {
  let s = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256b64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return b64url(digest);
}

/* ── Connect / token ── */
export async function connectSpotify(clientId: string): Promise<void> {
  if (!clientId.trim()) throw new Error('Enter your Spotify Client ID first.');
  setClientId(clientId);

  const verifier = randomBytesB64Url(48);
  const challenge = await sha256b64url(verifier);
  const state = randomBytesB64Url(12);

  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPE,
  })}`;

  // Start the loopback listener first, then open the browser
  const listen = invoke<string>('spotify_oauth_listen', { port: PORT });
  await openUrl(authUrl);
  const query = await listen;

  const params = new URLSearchParams(query);
  if (params.get('error')) throw new Error(`Spotify: ${params.get('error')}`);
  if (params.get('state') !== state) throw new Error('OAuth state mismatch — please retry.');
  const code = params.get('code');
  if (!code) throw new Error('No authorization code returned.');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (HTTP ${res.status}). Check the redirect URI in your Spotify app.`);
  const j = await res.json();
  saveToken({ clientId, access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + j.expires_in * 1000 });
}

async function getValidToken(): Promise<string> {
  const t = loadToken();
  if (!t) throw new Error('Not connected to Spotify.');
  if (Date.now() < t.expiresAt - 30_000) return t.access;

  // Refresh
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: t.clientId }),
  });
  if (!res.ok) { disconnectSpotify(); throw new Error('Spotify session expired — please reconnect.'); }
  const j = await res.json();
  const next: TokenData = { ...t, access: j.access_token, expiresAt: Date.now() + j.expires_in * 1000, refresh: j.refresh_token ?? t.refresh };
  saveToken(next);
  return next.access;
}

async function api(path: string): Promise<any> {
  const token = await getValidToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify API ${res.status}`);
  return res.json();
}

/* ── Data ── */
export interface SpotifyPlaylist { id: string; name: string; trackCount: number; image: string; }

export async function getMySpotifyPlaylists(): Promise<SpotifyPlaylist[]> {
  const out: SpotifyPlaylist[] = [];
  let url = '/me/playlists?limit=50';
  for (let guard = 0; guard < 20 && url; guard++) {
    const page = await api(url);
    for (const p of page.items ?? []) {
      if (!p) continue;
      out.push({ id: p.id, name: p.name, trackCount: p.tracks?.total ?? 0, image: p.images?.[0]?.url ?? '' });
    }
    url = page.next ? page.next.replace('https://api.spotify.com/v1', '') : '';
  }
  return out;
}

export async function getSpotifyPlaylistTracksAuthed(playlistId: string): Promise<SourceTrack[]> {
  const out: SourceTrack[] = [];
  let url = `/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(name,artists(name)))`;
  for (let guard = 0; guard < 50 && url; guard++) {
    const page = await api(url);
    for (const item of page.items ?? []) {
      const tr = item?.track;
      if (!tr?.name) continue;
      out.push({ title: tr.name, artist: tr.artists?.[0]?.name ?? '' });
    }
    url = page.next ? page.next.replace('https://api.spotify.com/v1', '') : '';
  }
  return out;
}
