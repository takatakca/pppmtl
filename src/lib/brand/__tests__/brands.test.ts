import { describe, expect, it } from "vitest";
import {
  BRANDS,
  KITCHENS,
  brandDishIds,
  isPreviewHost,
  orderLinkUrl,
  resolveBrandId,
  uuidToBase64Url,
  formatTime,
  listKitchens,
  defaultKitchen,
} from "@/config/brands";
import { cloverPhotoIds } from "@/data/clover/photos.generated";
import {
  brandExtras,
  brandSeo,
  h1Line,
  hasDelivery,
  brandsInKitchen,
  factualAbout,
  itemForClover,
  llmsTxt,
  hubLlmsTxt,
} from "@/lib/brand/facts";
import { brandJsonLd } from "@/lib/brand/schema";

const franchise = BRANDS.filter((b) => b.id !== "ppp");

describe("brand registry", () => {
  it("has one brand per domain and unique ids", () => {
    expect(new Set(BRANDS.map((b) => b.id)).size).toBe(BRANDS.length);
    expect(new Set(BRANDS.map((b) => b.domain)).size).toBe(BRANDS.length);
  });

  it("gives every franchise brand 10 to 12 real dishes, each with a Clover slot and a photo", () => {
    for (const b of franchise) {
      const ids = brandDishIds(b);
      expect(ids.length, b.id).toBeGreaterThanOrEqual(10);
      expect(ids.length, b.id).toBeLessThanOrEqual(12);
      for (const id of [...ids, ...b.heroItems]) {
        expect(itemForClover(id), `${b.id} ${id}`).not.toBeNull();
        expect(cloverPhotoIds.includes(id), `${b.id} ${id} photo`).toBe(true);
      }
    }
  });

  it("never links or names Po Poulet NDG (DoorDash 27982486)", () => {
    const text = JSON.stringify(BRANDS);
    expect(text).not.toContain("27982486");
    const popoulet = BRANDS.find((b) => b.id === "popoulet")!;
    expect(popoulet.kitchens.map((k) => k.kitchen)).toEqual(["st-leonard", "hochelaga"]);
    expect(llmsTxt(popoulet)).not.toContain("Somerled");
    expect(JSON.stringify(brandJsonLd(popoulet))).not.toContain("Somerled");
  });

  it("never calls a brand a ghost, virtual or delivery-only kitchen", () => {
    const words = /ghost|virtu|delivery[- ]only|livraison seulement|cuisine fantôme/i;
    for (const b of BRANDS) {
      expect(words.test(JSON.stringify(b)), b.id).toBe(false);
      expect(words.test(llmsTxt(b)), b.id).toBe(false);
    }
  });

  it("uses colours made for white text on buttons", () => {
    for (const b of franchise) expect(b.primary, b.id).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("puts every brand in its kitchens, and every brand at Hochelaga (owner, 2026-10-10)", () => {
    expect(brandsInKitchen("ndg").length).toBeGreaterThan(10);
    expect(brandsInKitchen("st-leonard").length).toBeGreaterThan(10);
    expect(brandsInKitchen("hochelaga").length).toBe(BRANDS.length);
    expect(brandsInKitchen("ndg").some((b) => b.id === "popoulet")).toBe(false);
    const popoulet = BRANDS.find((b) => b.id === "popoulet")!;
    expect(listKitchens(popoulet)).toEqual(["st-leonard", "hochelaga"]);
    expect(defaultKitchen(popoulet, "ndg")).toBe("st-leonard");
    expect(defaultKitchen(BRANDS.find((b) => b.id === "ppp")!)).toBe("ndg");
  });
});

describe("fast food, late hours, dishes not in Clover yet", () => {
  it("never claims 24-hour opening anywhere", () => {
    const never = /24\s*h\b|24\s*\/\s*7|24-7|24 heures|24 hours|jour et nuit|day and night/i;
    for (const b of BRANDS) {
      const text = [
        JSON.stringify(b),
        llmsTxt(b),
        JSON.stringify(brandSeo(b)),
        JSON.stringify(brandJsonLd(b)),
      ].join(" ");
      expect(never.test(text), b.id).toBe(false);
    }
    expect(never.test(hubLlmsTxt())).toBe(false);
  });

  it("follows the keyword template: title ≤ 60, description ≤ 155, fast food in the H1 line, livraison only with a visible store", () => {
    for (const b of franchise) {
      const seo = brandSeo(b);
      expect(seo.title.length, b.id).toBeLessThanOrEqual(60);
      expect(seo.title, b.id).toContain(b.name);
      expect(seo.description.length, b.id).toBeLessThanOrEqual(155);
      // NDG hours are not approved yet: no "ouvert tard" or "3 h" claim until they are.
      if (!KITCHENS.ndg.hours) expect(seo.description, b.id).not.toMatch(/tard|(?<!\d)3 h/i);
      expect(h1Line(b, "fr"), b.id).toContain("fast food");
      expect(/livraison/i.test(seo.description), b.id).toBe(hasDelivery(b));
      expect(b.keywords.length, b.id).toBeGreaterThan(5);
    }
    const popoulet = BRANDS.find((x) => x.id === "popoulet")!;
    expect(brandSeo(popoulet).description).not.toMatch(/à 3 h|tard/);
    expect(brandSeo(popoulet).description).toMatch(/ouvert tous les jours jusqu’à 23 h/);
  });

  it("publishes only owner-approved hours (Jean-Talon 10:00–23:00; NDG and Hochelaga not yet)", () => {
    expect(KITCHENS["st-leonard"].hours).toEqual({ opens: "10:00", closes: "23:00" });
    for (const b of BRANDS) {
      const ld = JSON.stringify(brandJsonLd(b));
      const llms = llmsTxt(b);
      for (const late of ["03:15", "16:30", "09:00", "3 h 15", "16 h 30"]) {
        expect(ld, b.id).not.toContain(late);
        expect(llms, b.id).not.toContain(late);
      }
    }
  });

  it("shows OOEUF's breakfast and Nutrition Shake's drinks with real prices, in llms.txt and schema.org", () => {
    for (const id of ["ooeuf", "nutrishake"]) {
      const b = BRANDS.find((x) => x.id === id)!;
      const extras = brandExtras(b);
      expect(extras.length, id).toBeGreaterThan(4);
      for (const x of extras)
        for (const size of x.sizes) expect(size.price, x.id).toBeGreaterThan(0);
      expect(llmsTxt(b)).toContain(extras[0]!.nameFr);
      expect(JSON.stringify(brandJsonLd(b))).toContain(extras[0]!.nameFr);
    }
  });
});

describe("domain → brand", () => {
  it("reads the brand from the host", () => {
    expect(resolveBrandId("pppmtl.com")).toBe("ppp");
    expect(resolveBrandId("www.ooeuf.ca")).toBe("ooeuf");
    expect(resolveBrandId("dejeuner.ooeuf.ca")).toBe("dejeuner");
    expect(resolveBrandId("pitalibanais.pppmtl.com")).toBe("pitalibanais");
    expect(resolveBrandId("preview.pipita.ca")).toBe("pipita");
    expect(resolveBrandId("POPOULET.CA:443")).toBe("popoulet");
    expect(resolveBrandId("pouletpoulet.popoulet.ca")).toBe("pouletpoulet");
    expect(resolveBrandId("placeafrique.bolon.ca")).toBe("placeafrique");
  });

  it("reads preview hosts (Coolify sslip.io, localhost)", () => {
    expect(resolveBrandId("ooeuf-ca.31-220-96-134.sslip.io")).toBe("ooeuf");
    expect(resolveBrandId("mythos-pppmtl-com.31-220-96-134.sslip.io")).toBe("mythos");
    expect(resolveBrandId("nutrishake.localhost:3000")).toBe("nutrishake");
    expect(isPreviewHost("ooeuf-ca.31-220-96-134.sslip.io")).toBe(true);
    expect(isPreviewHost("ooeuf.ca")).toBe(false);
  });

  it("falls back to PPP for any other host", () => {
    expect(resolveBrandId("")).toBe("ppp");
    expect(resolveBrandId("evil.example.com")).toBe("ppp");
    expect(resolveBrandId("ooeuf.ca.evil.example.com")).toBe("ppp");
  });
});

describe("links and facts", () => {
  it("builds the Uber Eats store id from the store uuid", () => {
    expect(uuidToBase64Url("3ca49ac1-fb4c-562d-b066-0389875f24eb")).toBe("PKSawftMVi2wZgOJh18k6w");
    expect(uuidToBase64Url("6cbb374c-c3a2-5951-b88c-11142bd5121a")).toBe("bLs3TMOiWVG4jBEUK9USGg");
    expect(orderLinkUrl({ platform: "doordash", store: "34525477", live: true }, "fr")).toBe(
      "https://www.doordash.com/fr-CA/store/34525477/",
    );
  });

  it("writes hours the Québec way", () => {
    expect(formatTime("16:30", "fr")).toBe("16 h 30");
    expect(formatTime("03:15", "en")).toBe("3:15 AM");
    expect(formatTime("09:00", "fr")).toBe("9 h");
  });

  it("gives the same address and phone in the page facts, llms.txt and schema.org", () => {
    const b = BRANDS.find((x) => x.id === "ooeuf")!;
    const about = factualAbout(b, "fr");
    const llms = llmsTxt(b);
    const ld = JSON.stringify(brandJsonLd(b));
    for (const k of b.kitchens.map((x) => KITCHENS[x.kitchen])) {
      expect(about).toContain(k.street);
      expect(llms).toContain(k.street);
      expect(ld).toContain(k.street);
      expect(ld).toContain(k.postalCode);
    }
    expect(ld).toContain('"@type":"Menu"');
    expect(ld).toContain('"priceCurrency":"CAD"');
    expect(ld).toContain("google.com/maps?cid=8027317480379740171");
  });

  it("puts Clover ordering first for NDG brands and never for Saint-Léonard-only Po Poulet", () => {
    const pipita = BRANDS.find((b) => b.id === "pipita")!;
    const popoulet = BRANDS.find((b) => b.id === "popoulet")!;
    const llms = llmsTxt(pipita);
    expect(llms).toContain("https://www.clover.com/online-ordering/6280");
    expect(llms.indexOf("clover.com")).toBeLessThan(llms.indexOf("ubereats.com"));
    expect(llmsTxt(popoulet)).not.toContain("clover.com");
    expect(JSON.stringify(brandJsonLd(popoulet))).not.toContain("clover.com");
  });

  it("lists every franchise brand in PPP's llms.txt", () => {
    const hub = hubLlmsTxt();
    for (const b of franchise) expect(hub).toContain(`https://${b.domain}/`);
  });
});
