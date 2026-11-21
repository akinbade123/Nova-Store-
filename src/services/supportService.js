import { api, mockDelay, USE_MOCK_DATA } from './api';

export const supportService = {
  /** Sends a contact-form message. Resolves to a ticket reference. */
  async contact(message) {
    if (!USE_MOCK_DATA) {
      const { data } = await api.post('/support/messages', message);
      return data;
    }
    await mockDelay(null, 1100);
    return { ticket: `SUP-${Math.floor(100000 + Math.random() * 900000)}` };
  },
};
