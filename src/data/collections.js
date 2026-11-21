/** Curated edits. `productIds` controls both membership and the default order. */
export const collections = [
  {
    slug: 'autumn-edit',
    name: 'The Autumn Edit',
    eyebrow: 'Seasonal',
    tagline: 'Layers worth living in.',
    description:
      'Knitwear, outerwear and everyday essentials cut from softer fabrics for the colder months — with up to 30% off selected styles.',
    image: '1445205170230-053b83016050',
    tone: 'dark',
    productIds: ['p-104', 'p-103', 'p-105', 'p-108', 'p-102', 'p-101', 'p-106', 'p-202'],
  },
  {
    slug: 'work-from-anywhere',
    name: 'Work From Anywhere',
    eyebrow: 'Tech',
    tagline: 'A quieter, better-equipped desk.',
    description: 'Laptops, tablets and audio chosen for focus — plus the bag that carries it all between home, office and café.',
    image: '1498049794561-7780e7231661',
    tone: 'light',
    productIds: ['p-008', 'p-006', 'p-007', 'p-001', 'p-004', 'p-201', 'p-005', 'p-002'],
  },
  {
    slug: 'slow-home',
    name: 'The Slow Home',
    eyebrow: 'Home & Living',
    tagline: 'Pieces for unhurried days.',
    description: 'Warm light, deep seats and small rituals — furniture and objects designed to make home the best room in your day.',
    image: '1618220179428-22790b461013',
    tone: 'light',
    productIds: ['p-301', 'p-304', 'p-302', 'p-305', 'p-303', 'p-306'],
  },
  {
    slug: 'sound-studio',
    name: 'Sound Studio',
    eyebrow: 'Audio',
    tagline: 'Hear every detail.',
    description: 'From studio monitors to pocketable earbuds, our audio range is tuned for honest sound and all-day comfort.',
    image: '1484704849700-f032a568e944',
    tone: 'dark',
    productIds: ['p-004', 'p-001', 'p-003', 'p-005'],
  },
  {
    slug: 'gifts-under-100',
    name: 'Gifts Under $100',
    eyebrow: 'Gift guide',
    tagline: 'Thoughtful, not extravagant.',
    description: 'Easy wins for birthdays, thank-yous and the people who say they don’t want anything.',
    image: '1556228453-efd6c1ff04f6',
    tone: 'light',
    productIds: ['p-205', 'p-306', 'p-101', 'p-103', 'p-108', 'p-007', 'p-102'],
  },
];

export const findCollection = (slug) => collections.find((collection) => collection.slug === slug) ?? null;
