import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Food Hub server secret and every `*.server` module must stay out of the browser bundle. Client-facing modules
 * may only reach them through server functions whose handlers import them dynamically.
 */
const CLIENT_FACING = [
  "src/lib/customer/customer.functions.ts",
  "src/lib/customer/repositories.ts",
  "src/lib/customer/session.tsx",
  "src/lib/customer/token.ts",
  "src/lib/orders/orders.functions.ts",
  "src/lib/integration/integrations.functions.ts",
  "src/lib/integration/providers/foodhub/interac.ts",
  "src/components/auth/guest-verify-sheet.tsx",
  "src/components/account/member-dashboard.tsx",
  "src/components/account/marketing-preferences.tsx",
  "src/routes/checkout.tsx",
  "src/routes/orders.$orderId.tsx",
  "src/routes/account.tsx",
  "src/routes/account_.sign-in.tsx",
  "src/routes/admin.integrations.tsx",
  // Imported by the admin page, so it ships in the browser bundle (the build had the secret's name from here).
  "src/config/integration-readiness.ts",
];

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("Food Hub secret stays on the server", () => {
  it("no client-facing module imports a *.server module statically (type-only imports excepted)", () => {
    for (const file of CLIENT_FACING) {
      const source = read(file)
        .split(/\r?\n/)
        .filter((line) => !/^\s*import\s+type\s/.test(line))
        .join("\n");
      const staticServerImport = /^\s*import\s[^;]*?\sfrom\s+["'][^"']*\.server["']/m;
      expect(staticServerImport.test(source), `${file} imports a .server module statically`).toBe(
        false,
      );
    }
  });

  it("no client-facing module names the secret environment variable", () => {
    for (const file of CLIENT_FACING) {
      expect(read(file), `${file} mentions the secret`).not.toContain(
        "FOODHUB_WEBSITE_ORDER_SECRET",
      );
      expect(read(file), `${file} reads process.env`).not.toMatch(/process\.env\b/);
    }
  });

  it("the server cookie is HttpOnly and the token shape is enforced before it is stored", () => {
    const cookie = read("src/lib/customer/customer-cookie.server.ts");
    expect(cookie).toContain("httpOnly: true");
    expect(cookie).toContain('sameSite: "lax"');
    expect(cookie).toMatch(/isCustomerToken\(token\)/);
  });
});
