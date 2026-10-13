// "Now Playing" workout display (EXPERIMENT) — puts the current exercise, set and rest
// countdown on the iPhone Lock Screen and in the Dynamic Island without a native app.
//
// A web page can't start a Live Activity (that is ActivityKit, native only). What it can do is
// play audio, and iOS shows whatever is playing in Now Playing: Lock Screen, Control Centre and
// the Dynamic Island. So while a workout runs this plays a silent track and fills in the Media
// Session metadata with the exercise / set / rest, and sets the track length to the rest so the
// system scrubber is the countdown.
//
// Two modes, because which one iOS accepts is the open question and only a phone can answer it:
//   'playback' — normal media session. Gets the Now Playing slot, but pauses other music.
//   'mix'      — audioSession 'ambient'. Mixes with music, but iOS may not give it a Now
//                Playing entry (and music already holds that slot while it plays).
//
// Everything is derived from the same state the UI uses (S.active, useUI.timer/work), so there
// is nothing to keep in sync — `describe()` is a pure function of it.
import { useSyncExternalStore } from 'react'
import { t } from './i18n.js'
import { exOr } from './exercises.js'

const MAX_TRACK = 900   // seconds; a silent 8-bit/8 kHz WAV is 8 kB per second

const clock = sec => Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')

// What the lock screen should say right now, or null when there is nothing to say.
export function describe(S, timer, work) {
  const A = S && S.active
  if (!A || !A.entries || !A.entries.length) return null
  const cur = Math.min(A.cur || 0, A.entries.length - 1)
  // The set you are on or about to do: the first unchecked set of the current exercise, else
  // of the next exercise that still has one (the rest after the last set of an exercise is
  // already "about" the next exercise).
  let ei = A.entries.findIndex((e, i) => i >= cur && e.sets.some(s => !s.done))
  if (ei < 0) ei = A.entries.findIndex(e => e.sets.some(s => !s.done))
  const finished = ei < 0
  if (finished) ei = cur
  const entry = A.entries[ei]
  const ex = exOr(entry.id)
  const si = entry.sets.findIndex(s => !s.done)
  const setNo = si < 0 ? entry.sets.length : si + 1
  const artist = [t('Set {0}/{1}', setNo, entry.sets.length), ex.eq].filter(Boolean).join(' · ')
  const album = A.name || 'openGym'
  if (work) return {
    title: t('Hold') + ' · ' + (work.label || ex.n), artist, album,
    track: { total: work.total, elapsed: work.total - work.left },
    key: ['w', work.label, work.total, work.endsAt, artist].join('|'),
  }
  if (timer) return {
    title: t('Rest') + ' → ' + ex.n, artist, album,
    track: { total: timer.total, elapsed: timer.total - timer.left },
    key: ['r', ex.n, timer.total, timer.endsAt, artist].join('|'),
  }
  return { title: ex.n, artist, album, track: null, key: ['i', ex.n, artist].join('|') }
}

/* ---------- silent audio ---------- */

// Silent mono 8-bit 8 kHz WAV of `sec` seconds (8-bit PCM silence is 0x80).
function silentWav(sec) {
  const rate = 8000, n = Math.max(1, Math.round(sec * rate))
  const buf = new ArrayBuffer(44 + n), v = new DataView(buf)
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  str(36, 'data'); v.setUint32(40, n, true)
  new Uint8Array(buf, 44).fill(0x80)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

/* ---------- controller ---------- */

let audio = null, srcUrl = null, trackLen = 0       // trackLen: 0 = the 1 s idle loop
let lastKey = '', want = false, handlersSet = false
let started = false

// 'idle' (nothing to show) | 'playing' | 'blocked' (iOS wants a tap first) | 'unsupported'
let status = 'idle'
const subs = new Set()
const setStatus = s => { if (s !== status) { status = s; subs.forEach(f => f()) } }
export const nowPlayingStatus = () => status
export const useNowPlayingStatus = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, nowPlayingStatus)

export const nowPlayingSupported = () =>
  typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof Audio !== 'undefined'

function play() {
  if (!audio) return
  audio.play().then(() => setStatus('playing')).catch(() => setStatus('blocked'))
}

function load(len, elapsed) {
  if (srcUrl) URL.revokeObjectURL(srcUrl)
  srcUrl = silentWav(len || 1)
  trackLen = len
  audio.loop = !len
  audio.src = srcUrl
  audio.onloadedmetadata = () => {
    if (len && elapsed > 0) { try { audio.currentTime = Math.min(elapsed, len) } catch (e) { /* */ } }
    if (want) play()
  }
}

function handlers(ui) {
  if (handlersSet) return
  handlersSet = true
  const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn) } catch (e) { /* unsupported action */ } }
  set('play', () => { want = true; play() })
  set('pause', () => { audio && audio.pause() })
  set('nexttrack', () => { if (ui.getState().timer) ui.getState().addRest(15) })     // +15 s
  set('previoustrack', () => { if (ui.getState().timer) ui.getState().addRest(-15) }) // −15 s
}

function teardown() {
  want = false; lastKey = ''
  if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load() }
  if (srcUrl) { URL.revokeObjectURL(srcUrl); srcUrl = null }
  trackLen = 0
  if (nowPlayingSupported()) {
    try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none' } catch (e) { /* */ }
  }
  setStatus(nowPlayingSupported() ? 'idle' : 'unsupported')
}

function apply(S, ui) {
  const mode = S.nowPlaying === 'playback' || S.nowPlaying === 'mix' ? S.nowPlaying : 'off'
  if (!nowPlayingSupported()) { setStatus(mode === 'off' ? 'idle' : 'unsupported'); return }
  const d = mode === 'off' ? null : describe(S, ui.timer, ui.work)
  if (!d) { if (audio) teardown(); else setStatus('idle'); return }

  if (!audio) { audio = new Audio(); audio.preload = 'auto'; audio.setAttribute('playsinline', '') }
  handlers(ui.self)
  // Must be set before the audio starts to take effect.
  try { if (navigator.audioSession) navigator.audioSession.type = mode === 'mix' ? 'ambient' : 'playback' } catch (e) { /* */ }
  want = true

  const len = d.track ? Math.min(Math.ceil(d.track.total), MAX_TRACK) : 0
  const stale = d.key !== lastKey
  lastKey = d.key
  if (!stale && audio.src) return

  if (len !== trackLen || !audio.src) load(len, d.track ? d.track.elapsed : 0)
  else if (d.track) { try { audio.currentTime = Math.min(d.track.elapsed, len) } catch (e) { /* */ } }
  if (audio.paused && audio.readyState >= 1) play()

  const art = [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }]
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: d.title, artist: d.artist, album: d.album, artwork: art })
    navigator.mediaSession.playbackState = 'playing'
    if (d.track) navigator.mediaSession.setPositionState({ duration: len, position: Math.min(d.track.elapsed, len), playbackRate: 1 })
    else navigator.mediaSession.setPositionState()
  } catch (e) { /* older engines: metadata still shows */ }
}

// Wire the store → media session. Safe to call once at app start; does nothing until the
// setting is switched on and a workout is active.
export function initNowPlaying(useStore, useUI) {
  if (started) return
  started = true
  const ui = {}
  const run = () => {
    const us = useUI.getState()
    ui.timer = us.timer; ui.work = us.work; ui.self = useUI
    apply(useStore.getState().S, ui)
  }
  useStore.subscribe(run)
  useUI.subscribe(run)
  // iOS only lets audio start from a tap. Any tap while a workout wants the audio retries it,
  // so a start that was blocked (e.g. the workout was restored on launch) recovers on the
  // very next set check.
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', () => {
      if (want && audio && audio.paused && audio.src) play()
    }, true)
  }
  run()
}
