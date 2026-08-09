/**
 * Front-end contract for customer marketing consent. Nothing is persisted yet —
 * the UI must never claim a preference was saved.
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

/** True while no marketing backend is connected. */
export const marketingPersistenceEnabled = false;
