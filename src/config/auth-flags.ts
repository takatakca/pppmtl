/**
 * Feature flags for auth entry points that have no backend wired up yet.
 * Flip these on once the corresponding integration is live — never fake
 * success in the UI while a flag is off.
 */

/** "Continue with Google" has no OAuth wired up yet — kept hidden until it does. */
export const GOOGLE_SIGN_IN_ENABLED = false;
