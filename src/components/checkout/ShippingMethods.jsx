import { RadioCard } from './RadioCard';
import { SHIPPING_METHODS } from '../../data/shipping';
import { shippingCost } from '../../utils/pricing';
import { deliveryWindow, formatPrice } from '../../utils/format';

export function ShippingMethods({ value, onChange, subtotal, freeShippingPromo }) {
  return (
    <div role="radiogroup" aria-label="Shipping method" className="space-y-3">
      {SHIPPING_METHODS.map((method) => {
        const cost = freeShippingPromo ? 0 : shippingCost(method, subtotal);
        const arrival =
          method.minDays === method.maxDays
            ? deliveryWindow(method.minDays, method.maxDays).split(' – ')[0]
            : deliveryWindow(method.minDays, method.maxDays);
        return (
          <RadioCard
            key={method.id}
            name="shippingMethod"
            value={method.id}
            checked={value === method.id}
            onChange={() => onChange(method.id)}
            title={`${method.label} · ${method.eta}`}
            description={`Arrives ${arrival}`}
            aside={
              cost === 0 ? (
                <span className="text-success">Free</span>
              ) : (
                <span className="tabular-nums">{formatPrice(cost)}</span>
              )
            }
          />
        );
      })}
    </div>
  );
}
