import { describe, expect, it } from "vitest";

import {
  formatCompactNumber,
  formatCurrencyFromCents,
  formatRelativeDate,
  formatStageLabel,
} from "@/lib/utils/format";

describe("format utilities", () => {
  it("formats compact whole numbers for metric cards", () => {
    expect(formatCompactNumber(2847)).toBe("2.8K");
  });

  it("formats currency from cents in English", () => {
    expect(formatCurrencyFromCents(124_500_000)).toBe("$1,245,000");
  });

  it("formats currency from cents in pt-BR", () => {
    expect(formatCurrencyFromCents(124_500_000, "pt-BR")).toContain("R$");
  });

  it("formats pipeline stage labels", () => {
    expect(formatStageLabel("sales_manager")).toBe("Sales Manager");
  });

  it("formats relative dates into readable timestamps", () => {
    expect(formatRelativeDate("2026-06-22T15:30:00.000Z")).toContain("Jun");
  });

  it("formats relative dates using Portuguese locale", () => {
    expect(formatRelativeDate("2026-06-22T15:30:00.000Z", "pt-BR")).toContain("jun.");
  });
});
