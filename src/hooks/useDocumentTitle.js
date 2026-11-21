import { useEffect } from 'react';

const BASE = 'NOVA';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE}` : `${BASE} — Discover Your Next Favourite`;
  }, [title]);
}
