import { Check } from 'lucide-react';
import { AccordionItem } from '../ui/Accordion';

const itemClass = 'rounded-md border border-line px-4';

export function ProductAccordion({ product }) {
  return (
    <div className="space-y-2">
      <AccordionItem className={itemClass} title="Details" defaultOpen>
        <p>{product.description}</p>
        {product.highlights?.length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {product.highlights.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-1 size-4 shrink-0 text-ink" strokeWidth={2} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </AccordionItem>

      {product.specs?.length > 0 && (
        <AccordionItem className={itemClass} title="Specifications">
          <dl className="divide-y divide-line rounded-md ring-1 ring-line">
            {product.specs.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-4 px-4 py-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </AccordionItem>
      )}

      {product.care && (
        <AccordionItem className={itemClass} title="Materials & care">
          <p>{product.care}</p>
        </AccordionItem>
      )}

      <AccordionItem className={itemClass} title="Delivery & returns">
        <ul className="space-y-2.5">
          <li>
            <span className="font-medium text-ink">Express (1–2 business days):</span> free on orders over $100, otherwise $9.95.
          </li>
          <li>
            <span className="font-medium text-ink">Standard (3–5 business days):</span> $4.95, free over $100.
          </li>
          <li>
            <span className="font-medium text-ink">Returns:</span> free within 30 days of delivery. Items must be unworn
            and in original packaging. Refunds are issued within 5 business days of arrival.
          </li>
        </ul>
      </AccordionItem>
    </div>
  );
}
