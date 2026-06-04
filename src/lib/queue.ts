export type RepeatMode = 'off' | 'all' | 'one';

interface NextOptions {
  shuffle: boolean;
  repeatMode: RepeatMode;
  // true when advancing because a track finished (vs. the user clicking next)
  auto: boolean;
  // injectable for testing; defaults to Math.random
  random?: () => number;
}

// Pure queue-advancement logic. Returns the next index to play, or null when
// playback should stop (queue finished with repeat off on auto-advance).
export function getNextIndex(currentIndex: number, queueLength: number, opts: NextOptions): number | null {
  if (queueLength === 0) return null;

  if (opts.shuffle) {
    if (queueLength === 1) return currentIndex >= 0 ? currentIndex : 0;
    const rnd = opts.random ?? Math.random;
    if (currentIndex < 0) return Math.floor(rnd() * queueLength);
    // Pick uniformly among the other tracks (offset 1..queueLength-1) so we
    // never immediately replay the current track and never spin in a loop.
    const offset = 1 + Math.floor(rnd() * (queueLength - 1));
    return (currentIndex + offset) % queueLength;
  }

  if (currentIndex < queueLength - 1) return currentIndex + 1;

  // Reached the end of the queue.
  if (opts.repeatMode === 'all' || !opts.auto) return 0;
  return null;
}

export function cycleRepeatMode(mode: RepeatMode): RepeatMode {
  return mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
}
