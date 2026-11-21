import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Disclosure row with a +/× toggle. Use inside a container with a top border. */
export function AccordionItem({ title, defaultOpen = false, open: controlledOpen, onToggle, headingLevel = 3, children, className }) {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  const id = useId();
  const Heading = `h${headingLevel}`;

  return (
    <div className={cn('border-b border-line', className)}>
      <Heading className="font-sans text-[15px] font-semibold tracking-normal">
        <button
          type="button"
          onClick={() => (onToggle ? onToggle(!open) : setLocalOpen(!open))}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 py-5 text-left"
        >
          {title}
          <Plus
            className={cn('size-5 shrink-0 text-muted transition-transform duration-300 ease-out-soft', open && 'rotate-45')}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </button>
      </Heading>
      <div id={id} hidden={!open} className="pb-6 text-[14.5px] leading-relaxed text-ink/75">
        {children}
      </div>
    </div>
  );
}
