import { Component } from 'react';
import { CircleAlert } from 'lucide-react';
import { reportError, newReference } from '../../services/errorReporter';

/**
 * Catches a crash while rendering a page, so one broken component shows this message instead of a
 * blank screen. The crash is reported with a reference that's also shown here, so if the shopper
 * contacts support, the report can be found. App.jsx gives it `key={pathname}`, so going to another
 * page starts fresh.
 */
export class ErrorBoundary extends Component {
  state = { reference: null };

  static getDerivedStateFromError() {
    return { reference: newReference() };
  }

  componentDidCatch(error, info) {
    reportError({ kind: 'render', error, componentStack: info.componentStack, reference: this.state.reference });
  }

  render() {
    if (!this.state.reference) return this.props.children;
    return (
      <main id="main" className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-24 text-center">
        <CircleAlert className="size-12 text-danger" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="mt-6 text-title font-bold tracking-tight">Something went wrong on this page</h1>
        <p className="mt-3 text-body leading-relaxed text-muted">
          We’ve been told about it. Try reloading, or head back to the shop. Your bag and account are safe.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-body font-semibold text-white can-hover:bg-ink-soft"
          >
            Reload the page
          </button>
          <a href="/" className="inline-flex h-12 items-center rounded-full px-6 text-body font-semibold ring-1 ring-inset ring-line-strong can-hover:ring-ink">
            Go to the home page
          </a>
        </div>
        <p className="mt-8 text-caption text-muted">
          If it keeps happening, contact us and quote reference <span className="font-mono font-medium text-ink">{this.state.reference}</span>.
        </p>
      </main>
    );
  }
}
