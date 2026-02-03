export function getActiveEpisodeId(): number | null {
  const v = localStorage.getItem('activeEpisodeId');
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function setActiveEpisodeId(id: number | null) {
  if (id === null) localStorage.removeItem('activeEpisodeId');
  else localStorage.setItem('activeEpisodeId', String(id));
}
