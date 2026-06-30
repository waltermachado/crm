import { describe, expect, it } from "vitest";

import { moveDealBetweenStages } from "@/lib/deals/reorder";
import type { DealStageRecord } from "@/types/deals";

const baseStages: DealStageRecord[] = [
  {
    id: "stage-a",
    slug: "NOVO_LEAD",
    label: "Novo Lead",
    colorClassName: "",
    dealCount: 2,
    totalValue: 300,
    displayTotalValue: "R$ 300",
    items: [
      {
        id: "deal-1",
        title: "Deal 1",
        companyName: "Acme",
        displayValue: "R$ 100",
        value: 100,
        expectedCloseLabel: "01 jul. 2026",
        owner: { id: "owner-1", name: "Walter" },
        stageId: "stage-a",
        stageSlug: "NOVO_LEAD",
        position: 0,
      },
      {
        id: "deal-2",
        title: "Deal 2",
        companyName: "Beta",
        displayValue: "R$ 200",
        value: 200,
        expectedCloseLabel: "02 jul. 2026",
        owner: { id: "owner-1", name: "Walter" },
        stageId: "stage-a",
        stageSlug: "NOVO_LEAD",
        position: 1,
      },
    ],
  },
  {
    id: "stage-b",
    slug: "PRIMEIRO_CONTATO",
    label: "Primeiro Contato",
    colorClassName: "",
    dealCount: 1,
    totalValue: 400,
    displayTotalValue: "R$ 400",
    items: [
      {
        id: "deal-3",
        title: "Deal 3",
        companyName: "Gamma",
        displayValue: "R$ 400",
        value: 400,
        expectedCloseLabel: "03 jul. 2026",
        owner: { id: "owner-1", name: "Walter" },
        stageId: "stage-b",
        stageSlug: "PRIMEIRO_CONTATO",
        position: 0,
      },
    ],
  },
];

describe("moveDealBetweenStages", () => {
  it("reorders a card inside the same stage", () => {
    const result = moveDealBetweenStages(baseStages, {
      dealId: "deal-1",
      sourceStageId: "stage-a",
      targetStageId: "stage-a",
      sourceIndex: 0,
      targetIndex: 2,
    });

    expect(result[0]?.items.map((item) => item.id)).toEqual(["deal-2", "deal-1"]);
    expect(result[0]?.items.map((item) => item.position)).toEqual([0, 1]);
    expect(result[0]?.dealCount).toBe(2);
    expect(result[0]?.totalValue).toBe(300);
  });

  it("moves a card across stages and recalculates totals", () => {
    const result = moveDealBetweenStages(baseStages, {
      dealId: "deal-2",
      sourceStageId: "stage-a",
      targetStageId: "stage-b",
      sourceIndex: 1,
      targetIndex: 1,
    });

    expect(result[0]?.dealCount).toBe(1);
    expect(result[1]?.dealCount).toBe(2);
    expect(result[1]?.totalValue).toBe(600);
    expect(result[1]?.items[1]?.stageSlug).toBe("PRIMEIRO_CONTATO");
  });
});
