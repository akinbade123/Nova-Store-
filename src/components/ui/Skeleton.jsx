import { cn } from '../../utils/cn';

export function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-md', className)} aria-hidden="true" />;
}
