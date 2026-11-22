// Small display helpers shared by several pages.

export function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString() : '';
}

export function attemptStatus(attempt) {
  if (attempt.status === 'IN_PROGRESS') return 'In progress';
  return attempt.autoSubmitted ? 'Auto-submitted' : 'Submitted';
}

export function percent(score, total) {
  return total ? `${Math.round((score / total) * 100)}%` : '';
}

// "mm:ss" for the quiz countdown.
export function formatSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
