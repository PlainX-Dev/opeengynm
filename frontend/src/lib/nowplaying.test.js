import { describe as suite, it, expect } from 'vitest'
import { describe } from './nowplaying.js'
import { EXDB } from './exercises-data.js'

const ex = EXDB[0]
const entry = (done, extra = {}) => ({ id: ex.id, sets: done.map(d => ({ done: d })), ...extra })
const S = (entries, cur = 0) => ({ active: { name: 'Push', cur, entries } })

suite('now-playing description', () => {
  it('uses the exercise still as cover art, and nothing for a custom exercise', () => {
    expect(describe(S([entry([false])]), null, null).img).toMatch(/\.(jpg|png)/)
    expect(describe(S([{ id: 'gone', sets: [{ done: false }] }]), null, null).img).toBe(null)
  })

  it('says nothing without an active workout', () => {
    expect(describe({ active: null }, null, null)).toBe(null)
    expect(describe(S([]), null, null)).toBe(null)
  })

  it('names the exercise and the set you are on between sets', () => {
    const d = describe(S([entry([true, false, false])]), null, null)
    expect(d.title).toBe(ex.n)
    expect(d.artist).toContain('Set 2/3')
    expect(d.album).toBe('Push')
    expect(d.track).toBe(null)
  })

  it('during rest, makes the track the countdown and points at the NEXT set', () => {
    const d = describe(S([entry([true, false, false])]), { left: 60, total: 90, endsAt: 1000 }, null)
    expect(d.title).toBe('Rest → ' + ex.n)
    expect(d.artist).toContain('Set 2/3')
    expect(d.track).toEqual({ total: 90, elapsed: 30 })
  })

  it('moves on to the next exercise when the current one is finished', () => {
    const d = describe(S([entry([true, true]), entry([false, false])]), { left: 10, total: 90, endsAt: 1 }, null)
    expect(d.artist).toContain('Set 1/2')
  })

  it('a hold shows its own elapsed time and wins over a stale rest', () => {
    const d = describe(S([entry([false])]), { left: 5, total: 90, endsAt: 1 }, { left: 20, total: 45, endsAt: 2, label: 'Plank' })
    expect(d.title).toBe('Hold · Plank')
    expect(d.track).toEqual({ total: 45, elapsed: 25 })
  })

  it('changes its key when time is added so the track is rebuilt, but not every second', () => {
    const s = S([entry([true, false])])
    const a = describe(s, { left: 60, total: 90, endsAt: 1000 }, null).key
    expect(describe(s, { left: 59, total: 90, endsAt: 1000 }, null).key).toBe(a)
    expect(describe(s, { left: 75, total: 105, endsAt: 16000 }, null).key).not.toBe(a)
  })

  it('survives a workout whose exercise no longer exists', () => {
    const d = describe(S([{ id: 'gone', sets: [{ done: false }] }]), null, null)
    expect(d.title).toBeTruthy()
  })
})
