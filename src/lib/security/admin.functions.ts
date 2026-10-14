/** Server actions for temporary PPP operations access. Replace the bootstrap with TAKATAK Auth roles. */
import { createServerFn } from "@tanstack/react-start";

export const adminAuthStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { adminConfigured, adminSessionActive } = await import("./admin.server");
  return { configured: adminConfigured(), authenticated: adminSessionActive() };
});

export const signInAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { credential: string }) => input)
  .handler(async ({ data }) => {
    const { openAdminSession } = await import("./admin.server");
    return { ok: openAdminSession(data.credential) };
  });

export const signOutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { closeAdminSession } = await import("./admin.server");
  closeAdminSession();
  return { ok: true };
});
