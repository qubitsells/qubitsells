export type PreviewCandidate = { slug: string; top: number; left: number; width: number; height: number };

export function previewVisibility(card: PreviewCandidate, viewport: { width: number; height: number }) {
  if (card.width <= 0 || card.height <= 0) return 0;
  const width = Math.max(0, Math.min(card.left + card.width, viewport.width) - Math.max(card.left, 0));
  const height = Math.max(0, Math.min(card.top + card.height, viewport.height) - Math.max(card.top, 0));
  return width * height / (card.width * card.height);
}

export function focusedMobilePreview(cards: PreviewCandidate[], viewport: { width: number; height: number }) {
  let selected: string | null = null;
  let nearest = Infinity;
  for (const card of cards) {
    if (previewVisibility(card, viewport) < .65) continue;
    const distance = Math.abs(card.top + card.height / 2 - viewport.height / 2);
    if (distance < nearest) { nearest = distance; selected = card.slug; }
  }
  return selected;
}

export function previewAutoplayAllowed({ hidden, reducedMotion, saveData }: { hidden: boolean; reducedMotion: boolean; saveData: boolean }) {
  return !hidden && !reducedMotion && !saveData;
}
