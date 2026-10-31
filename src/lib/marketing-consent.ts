/**
 * Front-end contract for customer marketing consent.
 *
 * One consent flag is real: Food Hub keeps `marketingConsent` on the customer record (offers and news by text
 * message or e-mail) and the account page reads and writes it through the customer session. Push notifications
 * have no backend: the UI must never claim that preference was saved.
 */
export type MarketingChannel = "email" | "sms" | "push";

export interface ConsentRecord {
  granted: boolean;
  consentedAt: string | null;
  revokedAt: string | null;
}

export interface MarketingPreferences {
  emailMarketingConsent: ConsentRecord;
  smsMarketingConsent: ConsentRecord;
  pushMarketingConsent: ConsentRecord;
}

export const emptyConsent: ConsentRecord = {
  granted: false,
  consentedAt: null,
  revokedAt: null,
};

export const defaultMarketingPreferences: MarketingPreferences = {
  emailMarketingConsent: emptyConsent,
  smsMarketingConsent: emptyConsent,
  pushMarketingConsent: emptyConsent,
};

/** Which channels are persisted somewhere real today. */
export const marketingChannelPersisted: Record<MarketingChannel, boolean> = {
  email: true,
  sms: true,
  push: false,
};

/** True while at least one channel is persisted (Food Hub `marketingConsent`). */
export const marketingPersistenceEnabled = true;
