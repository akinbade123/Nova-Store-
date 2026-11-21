import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <Container className="flex flex-col items-center py-28 text-center lg:py-40">
      <p className="font-display text-8xl font-extrabold tracking-tighter text-line-strong sm:text-9xl">404</p>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">We can’t find that page</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        It may have moved, or the link might be out of date. Let’s get you back to something good.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button to="/">Back to home</Button>
        <Button to="/shop" variant="secondary">
          Browse the shop
        </Button>
      </div>
    </Container>
  );
}
