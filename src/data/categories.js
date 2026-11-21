export const categories = [
  {
    id: 'electronics',
    slug: 'electronics',
    name: 'Electronics',
    tagline: 'Sound, screens & smart tech',
    image: '1498049794561-7780e7231661',
  },
  {
    id: 'fashion',
    slug: 'fashion',
    name: 'Fashion',
    tagline: 'Wardrobe staples, elevated',
    image: '1556905055-8f358a7a47b2',
  },
  {
    id: 'accessories',
    slug: 'accessories',
    name: 'Accessories',
    tagline: 'The finishing details',
    image: '1524592094714-0f0654e20314',
  },
  {
    id: 'home-living',
    slug: 'home-living',
    name: 'Home & Living',
    tagline: 'Pieces for slower days',
    image: '1586023492125-27b2c045efd7',
  },
];

export const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name ?? slug;
