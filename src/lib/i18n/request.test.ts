import { describe, expect, it } from "vitest";

import { resolveLocale } from "@/lib/i18n/resolve-locale";

describe("resolveLocale", () => {
  it("prefers the saved cookie when present", () => {
    expect(
      resolveLocale({
        cookieLocale: "en-US",
        country: "BR",
        acceptLanguage: "pt-BR,pt;q=0.9",
      }),
    ).toBe("en-US");
  });

  it("defaults to pt-BR for Brazilian regional headers", () => {
    expect(
      resolveLocale({
        country: "BR",
        acceptLanguage: "en-US,en;q=0.8",
      }),
    ).toBe("pt-BR");
  });

  it("uses accept-language as fallback when country is absent", () => {
    expect(
      resolveLocale({
        acceptLanguage: "pt-BR,pt;q=0.9,en-US;q=0.8",
      }),
    ).toBe("pt-BR");
  });

  it("falls back to English when nothing matches", () => {
    expect(resolveLocale({})).toBe("en-US");
  });
});
