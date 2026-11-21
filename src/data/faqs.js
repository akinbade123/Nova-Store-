/** Help centre content. Section ids double as URL anchors (e.g. /help#returns). */
export const faqSections = [
  {
    id: 'orders',
    title: 'Orders & tracking',
    summary: 'Track, change or cancel an order',
    questions: [
      {
        q: 'How do I track my order?',
        a: 'Once your order ships we email a tracking number. Signed-in customers can also follow every order from Account → Orders, where you’ll see the courier, tracking number and delivery progress.',
      },
      {
        q: 'Can I change or cancel my order?',
        a: 'Orders can be cancelled until they ship — usually within a few hours. Go to Account → Orders, open the order and choose “Cancel order”. If it has already shipped, you can return it free once it arrives.',
      },
      {
        q: 'I checked out as a guest. Can I still see my order?',
        a: 'Yes. Create an account or sign in with the same email you used at checkout and your guest orders will appear in your order history automatically.',
      },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & delivery',
    summary: 'Delivery times, costs and countries',
    questions: [
      {
        q: 'How much does shipping cost?',
        a: 'Standard (3–5 business days) is $4.95 and Express (1–2 business days) is $9.95 — both are free on orders over $100. Next-day delivery is $19.95 when ordered before 2pm.',
      },
      {
        q: 'Which countries do you ship to?',
        a: 'We ship to more than 30 countries, including the United States, United Kingdom, Canada, Nigeria, Ghana, Kenya, South Africa, Ireland, Germany, France, the Netherlands and Australia. Duties may apply for some destinations and are shown at checkout.',
      },
      {
        q: 'My order hasn’t arrived. What should I do?',
        a: 'Check the tracking link first — couriers occasionally update late. If it’s more than two business days past the estimated date, contact us with your order number and we’ll chase it or send a replacement.',
      },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & refunds',
    summary: 'Free 30-day returns, refunds and exchanges',
    questions: [
      {
        q: 'What is your returns policy?',
        a: 'You can return any item within 30 days of delivery, free of charge. Items should be unused and in their original packaging. Final-sale items are marked on the product page.',
      },
      {
        q: 'How do I start a return?',
        a: 'Open the order in Account → Orders and choose “Return items”, or contact us with your order number if you checked out as a guest. We’ll email a prepaid label and drop-off options.',
      },
      {
        q: 'When will I get my refund?',
        a: 'Refunds are issued to your original payment method within 5 business days of the return reaching us. Your bank may take a few extra days to show it.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & promotions',
    summary: 'Accepted payment methods and promo codes',
    questions: [
      {
        q: 'Which payment methods do you accept?',
        a: 'Visa, Mastercard, American Express, PayPal, Apple Pay and Google Pay. All payments are encrypted, and we never store your full card number.',
      },
      {
        q: 'How do I use a promo code?',
        a: 'Enter it in “Have a promo code?” in your bag or at checkout. Only one code can be used per order, and some codes need a minimum spend.',
      },
      {
        q: 'Are prices inclusive of tax?',
        a: 'Yes, prices include applicable taxes. Import duties for some international destinations are calculated and shown before you pay.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    summary: 'Sign-in, passwords and saved details',
    questions: [
      {
        q: 'I forgot my password.',
        a: 'Use “Forgot password?” on the sign-in page. We’ll email you a reset link that’s valid for one hour.',
      },
      {
        q: 'How do I update my details or addresses?',
        a: 'Go to Account → Settings to change your name, email, password and communication preferences, or Account → Addresses to manage saved addresses and your default.',
      },
      {
        q: 'How do I delete my account?',
        a: 'Go to Account → Settings → Delete account. This permanently removes your profile and saved details; past orders are kept only as long as the law requires.',
      },
    ],
  },
];
