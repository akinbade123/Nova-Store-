/* Brand marks drawn locally (Lucide no longer ships brand icons). */

const base = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true };

export const InstagramIcon = (props) => (
  <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const XIcon = (props) => (
  <svg {...base} fill="currentColor" {...props}>
    <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
  </svg>
);

export const FacebookIcon = (props) => (
  <svg {...base} fill="currentColor" {...props}>
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.87.25-1.46 1.5-1.46H16.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.87 1.4-3.87 3.98v2.22H7.8v3h2.6V21h3.1Z" />
  </svg>
);

export const YouTubeIcon = (props) => (
  <svg {...base} fill="currentColor" {...props}>
    <path d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
  </svg>
);

export const TikTokIcon = (props) => (
  <svg {...base} fill="currentColor" {...props}>
    <path d="M16.6 3c.3 2.07 1.53 3.4 3.4 3.6v2.62a6.3 6.3 0 0 1-3.37-1.04v6.07A5.75 5.75 0 1 1 10.9 8.6v2.73a3.1 3.1 0 1 0 2.13 2.94V3h3.57Z" />
  </svg>
);

/* Payment marks rendered as neutral, uniform cards. */
function PaymentCard({ label, children }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex h-7 w-11 items-center justify-center rounded-[5px] bg-white ring-1 ring-black/5"
    >
      {children}
    </span>
  );
}

export const paymentMethods = [
  {
    name: 'Visa',
    mark: (
      <svg viewBox="0 0 48 16" className="h-[11px]" aria-hidden="true">
        <text x="0" y="14" fontFamily="Arial, sans-serif" fontSize="17" fontStyle="italic" fontWeight="900" fill="#1a1f71">VISA</text>
      </svg>
    ),
  },
  {
    name: 'Mastercard',
    mark: (
      <svg viewBox="0 0 32 20" className="h-[16px]" aria-hidden="true">
        <circle cx="12" cy="10" r="8" fill="#eb001b" />
        <circle cx="20" cy="10" r="8" fill="#f79e1b" />
        <path d="M16 3.07a8 8 0 0 1 0 13.86 8 8 0 0 1 0-13.86Z" fill="#ff5f00" />
      </svg>
    ),
  },
  {
    name: 'American Express',
    mark: (
      <span className="flex h-full w-full items-center justify-center rounded-[5px] bg-[#1f72cd] text-[8px] font-extrabold tracking-tight text-white">
        AMEX
      </span>
    ),
  },
  {
    name: 'PayPal',
    mark: (
      <span className="text-[9px] font-extrabold italic tracking-tight">
        <span className="text-[#003087]">Pay</span>
        <span className="text-[#009cde]">Pal</span>
      </span>
    ),
  },
  {
    name: 'Apple Pay',
    mark: (
      <span className="flex items-center gap-[2px] text-[9px] font-semibold tracking-tight text-black">
        <svg viewBox="0 0 14 17" className="h-[10px] w-auto" fill="currentColor" aria-hidden="true">
          <path d="M11.6 9c0-2 1.7-3 1.8-3a3.9 3.9 0 0 0-3-1.6c-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.8-2.8-.7A4.1 4.1 0 0 0 1 6.6c-1.5 2.6-.4 6.4 1 8.5.7 1 1.6 2.2 2.7 2.1 1-.1 1.5-.7 2.8-.7s1.6.7 2.8.7c1.1 0 1.9-1 2.6-2.1a9 9 0 0 0 1.2-2.4A3.7 3.7 0 0 1 11.6 9ZM9.5 2.9A3.6 3.6 0 0 0 10.4 0a3.8 3.8 0 0 0-2.5 1.3 3.5 3.5 0 0 0-.9 2.6 3.1 3.1 0 0 0 2.5-1Z" />
        </svg>
        Pay
      </span>
    ),
  },
  {
    name: 'Google Pay',
    mark: <span className="text-[9px] font-semibold tracking-tight text-[#3c4043]">G Pay</span>,
  },
];

export function PaymentIcons({ className }) {
  return (
    <ul className={className} aria-label="Accepted payment methods">
      {paymentMethods.map((method) => (
        <li key={method.name}>
          <PaymentCard label={method.name}>{method.mark}</PaymentCard>
        </li>
      ))}
    </ul>
  );
}
