/**
 * Extended product information for the Product Details page.
 * Category defaults keep every product complete; per-product overrides add specifics.
 * A real API would return these fields on GET /products/:slug.
 */

const categoryDefaults = {
  electronics: {
    highlights: ['2-year NOVA warranty included', 'Free firmware updates for life', 'Recyclable, plastic-free packaging'],
    specs: [
      ['Connectivity', 'Bluetooth 5.3, USB-C'],
      ['Battery', 'Up to 30 hours'],
      ['Charging', 'USB-C fast charge — 10 min for 3 hours'],
      ['Weight', '250 g'],
      ['Warranty', '2 years'],
      ['In the box', 'Device, USB-C cable, quick-start guide'],
    ],
    care: 'Wipe clean with a soft, dry cloth. Avoid liquids and extreme temperatures.',
    sizeGuide: null,
  },
  fashion: {
    highlights: ['Responsibly sourced materials', 'True to size — see size guide', 'Free returns within 30 days'],
    specs: [
      ['Material', '100% organic cotton'],
      ['Fit', 'Relaxed, true to size'],
      ['Origin', 'Made in Portugal'],
      ['Care', 'Machine wash cold, line dry'],
    ],
    care: 'Machine wash cold with similar colours. Do not tumble dry. Iron on low heat if needed.',
    sizeGuide: 'apparel',
  },
  accessories: {
    highlights: ['Built to last for years of daily use', '1-year NOVA warranty', 'Arrives gift-ready'],
    specs: [
      ['Material', 'Full-grain leather and brushed steel'],
      ['Dimensions', '30 × 20 × 10 cm'],
      ['Weight', '420 g'],
      ['Warranty', '1 year'],
    ],
    care: 'Store in the dust bag provided. Condition leather every few months.',
    sizeGuide: null,
  },
  'home-living': {
    highlights: ['Designed in Copenhagen', 'Sustainably sourced materials', 'White-glove delivery on furniture'],
    specs: [
      ['Material', 'Solid oak and steel'],
      ['Dimensions', 'W 80 × D 50 × H 45 cm'],
      ['Assembly', 'Minimal — tools included'],
      ['Warranty', '5 years on frame'],
    ],
    care: 'Dust regularly with a soft cloth. Keep out of direct sunlight to protect the finish.',
    sizeGuide: null,
  },
};

const overrides = {
  'aura-wireless-headphones': {
    crops: [
      { zoom: 1.5, x: 0.62, y: 0.5 },
      { zoom: 2.4, x: 0.72, y: 0.62 },
      { zoom: 2.4, x: 0.52, y: 0.36 },
    ],
    highlights: ['Adaptive noise cancellation', '40-hour battery with fast charge', 'Memory-foam ear cushions', 'Multipoint pairing with two devices'],
    specs: [
      ['Driver', '40 mm dynamic'],
      ['Noise cancellation', 'Adaptive hybrid ANC'],
      ['Battery', 'Up to 40 hours (ANC on)'],
      ['Charging', 'USB-C — 10 min for 5 hours'],
      ['Connectivity', 'Bluetooth 5.3, multipoint'],
      ['Weight', '254 g'],
      ['In the box', 'Headphones, carry case, USB-C cable, 3.5 mm cable'],
    ],
  },
  'halo-noise-cancelling-headphones': {
    highlights: ['Eight-microphone noise cancellation', 'Spatial audio with head tracking', '30-hour battery', 'Folds flat into a slim case'],
  },
  'moto-leather-jacket': {
    // Focus on the zip and hardware rather than the collar.
    crops: [
      { zoom: 1.6, x: 0.5, y: 0.68 },
      { zoom: 2.4, x: 0.32, y: 0.78 },
      { zoom: 2.4, x: 0.6, y: 0.62 },
    ],
    highlights: ['Full-grain lambskin leather', 'Asymmetric YKK zip', 'Quilted shoulder panels', 'Satin lining with inner pocket'],
    specs: [
      ['Outer', '100% lambskin leather'],
      ['Lining', '100% viscose satin'],
      ['Fit', 'Slim — size up for layering'],
      ['Origin', 'Made in Turkey'],
      ['Care', 'Specialist leather clean only'],
    ],
    care: 'Hang on a broad hanger away from heat. Specialist leather clean only.',
  },
  'velvet-three-seater-sofa': {
    highlights: ['Performance velvet, stain resistant', 'Feather-wrapped seat cushions', 'Solid oak legs', 'Free white-glove delivery'],
    specs: [
      ['Upholstery', 'Performance velvet (100% polyester)'],
      ['Frame', 'Kiln-dried hardwood'],
      ['Legs', 'Solid oak'],
      ['Dimensions', 'W 214 × D 92 × H 84 cm'],
      ['Seat height', '45 cm'],
      ['Warranty', '10 years on frame'],
    ],
  },
  'commuter-backpack': {
    highlights: ['Weatherproof recycled nylon', 'Padded 16" laptop sleeve', 'Luggage pass-through strap', 'Lifetime warranty'],
    specs: [
      ['Material', 'Recycled 600D nylon, water-repellent'],
      ['Capacity', '22 litres'],
      ['Laptop sleeve', 'Fits up to 16"'],
      ['Dimensions', '46 × 30 × 15 cm'],
      ['Weight', '980 g'],
      ['Warranty', 'Lifetime'],
    ],
  },
  'aero-knit-runner': {
    specs: [
      ['Upper', 'Engineered recycled knit'],
      ['Midsole', 'Responsive EVA foam'],
      ['Outsole', 'Rubber with flex grooves'],
      ['Drop', '8 mm'],
      ['Weight', '255 g (UK 8)'],
    ],
    sizeGuide: 'shoes',
  },
  'prism-court-sneaker': { sizeGuide: 'shoes' },
};

export function getProductDetails(product) {
  const base = categoryDefaults[product.category] ?? categoryDefaults.accessories;
  return { ...base, ...(overrides[product.slug] ?? {}) };
}

export const sizeGuides = {
  apparel: {
    title: 'Apparel size guide',
    note: 'Measurements are body measurements in centimetres. Between sizes? We recommend sizing up.',
    columns: ['Size', 'Chest', 'Waist', 'Hip'],
    rows: [
      ['XS', '82–87', '66–71', '84–89'],
      ['S', '88–93', '72–77', '90–95'],
      ['M', '94–99', '78–83', '96–101'],
      ['L', '100–105', '84–89', '102–107'],
      ['XL', '106–111', '90–95', '108–113'],
    ],
  },
  shoes: {
    title: 'Footwear size guide',
    note: 'Sizes shown in US men’s. Measure your foot heel to toe and compare to the length column.',
    columns: ['US', 'UK', 'EU', 'Length (cm)'],
    rows: [
      ['6', '5.5', '38.5', '24.0'],
      ['7', '6', '40', '25.0'],
      ['8', '7', '41', '26.0'],
      ['9', '8', '42.5', '27.0'],
      ['10', '9', '44', '28.0'],
      ['11', '10', '45', '29.0'],
      ['12', '11', '46', '30.0'],
    ],
  },
};

/* ------------------------------------------------------------------ */
/* Sample reviews                                                      */
/* ------------------------------------------------------------------ */

const reviewers = [
  ['Chioma A.', 'Abuja'],
  ['James W.', 'Manchester'],
  ['Priya S.', 'Bangalore'],
  ['Lucas M.', 'São Paulo'],
  ['Emma R.', 'Dublin'],
  ['Kwame O.', 'Accra'],
  ['Hannah K.', 'Berlin'],
  ['Tomás L.', 'Madrid'],
  ['Aisha B.', 'Nairobi'],
  ['Oliver P.', 'Melbourne'],
];

const reviewPool = {
  electronics: [
    [5, 'Worth every penny', 'Setup took less than a minute and the quality is outstanding. Battery life is even better than advertised.'],
    [5, 'Beautifully made', 'Feels premium in the hand. The finish is flawless and it pairs instantly with my phone and laptop.'],
    [4, 'Great, with one small gripe', 'Performance is excellent. I wish the case were a little slimmer, but that’s a minor point.'],
    [5, 'My daily essential', 'I use it every single day. Delivery was quick and the packaging was a joy to open.'],
    [3, 'Good but not perfect', 'Does what it says. Took a couple of days to get used to the controls.'],
  ],
  fashion: [
    [5, 'Perfect fit', 'Ordered my usual size and it fits exactly as expected. The fabric feels substantial and soft.'],
    [5, 'Already ordered another colour', 'Washes really well with no shrinking. It has become my go-to.'],
    [4, 'Lovely quality', 'Great quality for the price. Slightly roomier than I expected, so consider sizing down if between sizes.'],
    [5, 'Compliments every time', 'The cut is so flattering and the colour is exactly as pictured.'],
    [3, 'Nice, runs a little long', 'Good material, but the length was longer than I expected on me.'],
  ],
  accessories: [
    [5, 'Exceeded expectations', 'The craftsmanship is superb — it looks and feels far more expensive than it is.'],
    [5, 'Perfect gift', 'Bought as a gift and it arrived beautifully packaged. They loved it.'],
    [4, 'Very happy', 'Solid build and thoughtful details. Took a week or two to break in.'],
    [5, 'Use it every day', 'Holds up perfectly to daily use. Still looks brand new after months.'],
  ],
  'home-living': [
    [5, 'Transformed the room', 'It’s the first thing guests notice. Quality is excellent and it was easy to set up.'],
    [5, 'Stunning in person', 'Photos don’t do it justice. The colour and finish are gorgeous.'],
    [4, 'Really pleased', 'Beautiful piece. Delivery was rescheduled once, but the team kept me informed throughout.'],
    [5, 'Built to last', 'Solid, well made and comfortable. Would absolutely buy from NOVA again.'],
  ],
};

const hash = (text) => [...text].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

/** Deterministic sample reviews so each product shows stable content between visits. */
export function getSampleReviews(product) {
  const pool = reviewPool[product.category] ?? reviewPool.accessories;
  const seed = hash(product.id);
  const base = new Date('2026-11-18');

  return Array.from({ length: 8 }, (_, i) => {
    const [rating, title, body] = pool[(seed + i) % pool.length];
    const [name, location] = reviewers[(seed + i * 3) % reviewers.length];
    const date = new Date(base);
    date.setDate(base.getDate() - (i * 9 + (seed % 7)));
    return {
      id: `${product.id}-r${i}`,
      rating,
      title,
      body,
      name,
      location,
      date: date.toISOString().slice(0, 10),
      verified: i % 4 !== 3,
      helpful: (seed + i * 7) % 40,
      variant: product.sizes.length ? `Size ${product.sizes[(seed + i) % product.sizes.length]}` : product.colors[0]?.name ?? null,
    };
  });
}

/** Approximates a star distribution from the average rating and total review count. */
export function ratingBreakdown(rating, total) {
  const s5 = Math.min(0.95, Math.max(0.2, ((rating - 3) / 2) * 0.88));
  const s4 = (1 - s5) * 0.62;
  const s3 = (1 - s5 - s4) * 0.55;
  const s2 = (1 - s5 - s4 - s3) * 0.5;
  const shares = [s5, s4, s3, s2, 1 - s5 - s4 - s3 - s2];
  return shares.map((share, i) => ({ stars: 5 - i, count: Math.round(share * total) }));
}
