import { api, mockDelay, USE_MOCK_DATA } from './api';

export const newsletterService = {
  async subscribe(email) {
    if (USE_MOCK_DATA) return mockDelay({ email, subscribed: true }, 900);
    const { data } = await api.post('/newsletter', { email });
    return data;
  },
};
