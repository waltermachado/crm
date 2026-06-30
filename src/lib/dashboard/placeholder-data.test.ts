import { describe, expect, it } from "vitest";

import { createPlaceholderDashboardSnapshot } from "@/lib/dashboard/placeholder-data";

describe("placeholderDashboardSnapshot", () => {
  it("provides the required metric cards", () => {
    const snapshot = createPlaceholderDashboardSnapshot();

    expect(snapshot.metrics).toHaveLength(4);
    expect(snapshot.metrics.map((metric) => metric.label)).toEqual([
      "Total Contacts",
      "Companies",
      "Deal Pipeline Revenue",
      "Support Tickets",
    ]);
  });

  it("keeps the pipeline scaffold populated with ordered stages", () => {
    const snapshot = createPlaceholderDashboardSnapshot();

    expect(snapshot.pipeline.map((stage) => stage.id)).toEqual([
      "qualification",
      "discovery",
      "proposal",
      "negotiation",
    ]);
    expect(snapshot.pipeline[0]?.items.length).toBeGreaterThan(0);
  });

  it("includes recent activities for the dashboard feed", () => {
    const snapshot = createPlaceholderDashboardSnapshot("pt-BR");

    expect(snapshot.activities.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.metrics[0]?.label).toBe("Total de contatos");
  });
});
