/**
 * The database stores integer cents; the API speaks dollars (docs/API.md, "Money").
 * Convert only at the edges, and never do arithmetic on dollar amounts.
 */
export const toDollars = (cents: number) => cents / 100;
export const toCents = (dollars: number) => Math.round(dollars * 100);
