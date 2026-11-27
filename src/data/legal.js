import { contactEmail } from './site';
/**
 * SAMPLE legal copy for the storefront design. It is not legal advice and must be
 * replaced with policies reviewed by a qualified lawyer before launch.
 */
export const legalDocs = {
  privacy: {
    title: 'Privacy policy',
    updated: '2026-11-01',
    intro:
      'This policy explains what personal information NOVA collects, why we collect it and the choices you have. We only collect what we need to run the store and look after your orders.',
    sections: [
      {
        id: 'information-we-collect',
        title: 'Information we collect',
        body: [
          'Details you give us: your name, email address, phone number, delivery and billing addresses, and anything you include when you contact us.',
          'Order information: the products you buy, payment method type and the last four digits of your card. Full card numbers are handled by our payment provider and never stored by NOVA.',
          'Usage information: pages viewed, device type and approximate location, collected through cookies as described in our cookie policy.',
        ],
      },
      {
        id: 'how-we-use-it',
        title: 'How we use your information',
        body: [
          'To process and deliver your orders, provide customer support, prevent fraud and meet our legal obligations.',
          'To send marketing emails, but only if you opt in. You can unsubscribe from any email or change your preferences in your account settings at any time.',
        ],
      },
      {
        id: 'sharing',
        title: 'Who we share it with',
        body: [
          'Couriers, payment providers and IT service providers who help us run the store, under contracts that require them to protect your data. We never sell your personal information.',
        ],
      },
      {
        id: 'your-rights',
        title: 'Your rights',
        body: [
          `Depending on where you live, you may have the right to access, correct, delete or export your information, and to object to certain processing. Most of this can be done from your account; for anything else, email ${contactEmail.privacy}.`,
        ],
      },
      {
        id: 'retention',
        title: 'How long we keep it',
        body: [
          'We keep account information while your account is open. Order records are kept for as long as tax and consumer law requires, typically six years.',
        ],
      },
      {
        id: 'contact',
        title: 'Contact',
        body: [`Questions about this policy can be sent to ${contactEmail.privacy}.`],
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    updated: '2026-11-01',
    intro: 'These terms apply when you use the NOVA website and buy from us. Please read them carefully before placing an order.',
    sections: [
      {
        id: 'orders',
        title: 'Placing an order',
        body: [
          'Your order is an offer to buy. A contract is formed when we email to confirm your order has been accepted. We may decline an order, for example if an item is out of stock or a pricing error has occurred; if so, you will not be charged.',
        ],
      },
      {
        id: 'pricing',
        title: 'Prices and payment',
        body: [
          'Prices are shown in US dollars and include applicable taxes. Shipping costs and any import duties are shown before you pay. Promo codes cannot be combined unless stated.',
        ],
      },
      {
        id: 'delivery',
        title: 'Delivery',
        body: ['Delivery estimates are shown at checkout. Risk in the products passes to you on delivery.'],
      },
      {
        id: 'returns',
        title: 'Returns and cancellations',
        body: [
          'You can cancel an order before it ships, and return most items within 30 days of delivery for a full refund. Items must be unused and in their original packaging. This does not affect your statutory rights.',
        ],
      },
      {
        id: 'warranty',
        title: 'Warranty and liability',
        body: [
          'Products come with the warranty described on the product page. Nothing in these terms limits liability that cannot legally be limited.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to these terms',
        body: ['We may update these terms from time to time. The version shown when you place an order applies to that order.'],
      },
    ],
  },
  cookies: {
    title: 'Cookie policy',
    updated: '2026-11-01',
    intro: 'Cookies are small files stored on your device. This policy explains which ones NOVA uses and how to control them.',
    sections: [
      {
        id: 'essential',
        title: 'Essential cookies',
        body: [
          'Needed for the store to work — for example remembering your bag, keeping you signed in and protecting checkout. These cannot be switched off.',
        ],
      },
      {
        id: 'analytics',
        title: 'Analytics cookies',
        body: ['Help us understand how the site is used so we can improve it. They are only set with your consent.'],
      },
      {
        id: 'marketing',
        title: 'Marketing cookies',
        body: ['Used to show relevant NOVA ads on other sites. They are only set with your consent and can be withdrawn at any time.'],
      },
      {
        id: 'managing',
        title: 'Managing cookies',
        body: ['You can change your choices at any time, or block cookies in your browser settings. Blocking essential cookies may stop parts of the store working.'],
      },
    ],
  },
};
