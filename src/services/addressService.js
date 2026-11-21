import { api, mockDelay, USE_MOCK_DATA } from './api';

const key = (userId) => `nova:addresses:${userId}`;

const DEMO_ADDRESSES = [
  {
    id: 'addr-home',
    label: 'Home',
    firstName: 'Ada',
    lastName: 'Okafor',
    address1: '14 Admiralty Way',
    address2: 'Flat 3B',
    city: 'Lekki Phase 1',
    region: 'Lagos',
    postalCode: '106104',
    country: 'NG',
    phone: '+234 803 555 0142',
    isDefault: true,
  },
  {
    id: 'addr-work',
    label: 'Work',
    firstName: 'Ada',
    lastName: 'Okafor',
    address1: '27 Marina Road',
    address2: 'Floor 9, Tower B',
    city: 'Lagos Island',
    region: 'Lagos',
    postalCode: '101001',
    country: 'NG',
    phone: '+234 803 555 0142',
    isDefault: false,
  },
];

/** Synchronous read — also used by checkout to prefill the default address. */
export function readAddresses(userId) {
  if (!userId) return [];
  try {
    const stored = localStorage.getItem(key(userId));
    if (stored) return JSON.parse(stored);
  } catch {
    /* fall through */
  }
  const seeded = userId === 'u-demo' ? DEMO_ADDRESSES : [];
  localStorage.setItem(key(userId), JSON.stringify(seeded));
  return seeded;
}

const write = (userId, list) => localStorage.setItem(key(userId), JSON.stringify(list));

/** Exactly one default whenever the list isn't empty. */
function normaliseDefault(list, preferredId) {
  if (!list.length) return list;
  const defaultId = preferredId ?? list.find((item) => item.isDefault)?.id ?? list[0].id;
  return list.map((item) => ({ ...item, isDefault: item.id === defaultId }));
}

export const addressService = {
  async list(userId) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.get('/me/addresses');
      return data;
    }
    return mockDelay(readAddresses(userId), 400);
  },

  async save(userId, address) {
    if (!USE_MOCK_DATA) {
      const { data } = address.id ? await api.put(`/me/addresses/${address.id}`, address) : await api.post('/me/addresses', address);
      return data;
    }
    await mockDelay(null, 600);
    const list = readAddresses(userId);
    const saved = { ...address, id: address.id ?? `addr-${crypto.randomUUID().slice(0, 8)}` };
    const exists = list.some((item) => item.id === saved.id);
    const merged = exists ? list.map((item) => (item.id === saved.id ? saved : item)) : [...list, saved];
    const next = normaliseDefault(merged, saved.isDefault || merged.length === 1 ? saved.id : undefined);
    write(userId, next);
    return next;
  },

  async remove(userId, addressId) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.delete(`/me/addresses/${addressId}`);
      return data;
    }
    await mockDelay(null, 400);
    const next = normaliseDefault(readAddresses(userId).filter((item) => item.id !== addressId));
    write(userId, next);
    return next;
  },

  async setDefault(userId, addressId) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.post(`/me/addresses/${addressId}/default`);
      return data;
    }
    await mockDelay(null, 300);
    const next = normaliseDefault(readAddresses(userId), addressId);
    write(userId, next);
    return next;
  },
};
