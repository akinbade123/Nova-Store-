import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { announcement } from '../../data/site';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export function AnnouncementBar() {
  const [dismissedId, setDismissedId] = useLocalStorage('nova:announcement-dismissed', null);
  if (dismissedId === announcement.id) return null;

  return (
    <div className="relative bg-ink text-white">
      <div className="mx-auto flex min-h-10 max-w-[1440px] items-center justify-center px-12 py-2 text-center text-[12.5px] leading-snug sm:text-[13px]">
        <p>
          <span className="hidden sm:inline">{announcement.highlight}</span>
          <span className="mx-2.5 hidden text-white/40 sm:inline" aria-hidden="true">|</span>
          <span>{announcement.message}</span>
          <Link
            to={announcement.link.to}
            className="ml-2 font-medium underline decoration-white/40 underline-offset-[3px] transition-colors hover:decoration-white"
          >
            {announcement.link.label}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissedId(announcement.id)}
        className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:right-4"
        aria-label="Dismiss announcement"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
