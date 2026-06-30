"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarClock, FileText, Phone, Trash2, UserRound } from "lucide-react";

import { deleteDealAction, saveDealAction } from "@/app/actions/deals";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DealDetailsRecord, DealOwnerSummary, DealStageRecord } from "@/types/deals";

type DealFormValues = {
  title: string;
  description: string;
  value: string;
  expectedCloseAt: string;
  stageId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  ownerId: string;
};

function toInputDate(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function buildInitialValues(
  deal: DealDetailsRecord | null,
  stages: DealStageRecord[],
  owners: DealOwnerSummary[],
): DealFormValues {
  return {
    title: deal?.title ?? "",
    description: deal?.description ?? "",
    value: deal ? String(deal.value) : "",
    expectedCloseAt: toInputDate(deal?.expectedCloseAt),
    stageId: deal?.stageId ?? stages[0]?.id ?? "",
    companyName: deal?.companyName ?? "",
    contactName: deal?.contactName ?? "",
    contactPhone: deal?.contactPhone ?? "",
    ownerId: deal?.owner.id ?? owners[0]?.id ?? "",
  };
}

const inputClassName =
  "flex h-11 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15";

export function DealSheet({
  open,
  onOpenChange,
  deal,
  stages,
  owners,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: DealDetailsRecord | null;
  stages: DealStageRecord[];
  owners: DealOwnerSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [values, setValues] = useState<DealFormValues>(() =>
    buildInitialValues(deal, stages, owners),
  );

  const isEditing = Boolean(deal);
  const title = useMemo(
    () => (isEditing ? "Detalhes do negócio" : "Novo negócio"),
    [isEditing],
  );

  useEffect(() => {
    setValues(buildInitialValues(deal, stages, owners));
    setMessage("");
  }, [deal, owners, stages]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await saveDealAction({
        id: deal?.id,
        title: values.title,
        description: values.description,
        value: Number(values.value),
        expectedCloseAt: values.expectedCloseAt || undefined,
        stageId: values.stageId,
        companyName: values.companyName,
        contactName: values.contactName || undefined,
        contactPhone: values.contactPhone || undefined,
        ownerId: values.ownerId,
      });

      setMessage(result.message);

      if (result.status === "success") {
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  function handleDelete() {
    if (!deal) {
      return;
    }

    startTransition(async () => {
      const result = await deleteDealAction({
        dealId: deal.id,
      });

      setMessage(result.message);

      if (result.status === "success") {
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-[620px] overflow-y-auto border-l border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-0 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-5">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          <SheetDescription>
            Edite contexto, valor, responsável e etapa sem sair do pipeline.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 py-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="deal-title">
                Nome do negócio
              </label>
              <input
                id="deal-title"
                className={inputClassName}
                value={values.title}
                onChange={(event) =>
                  setValues((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex.: Expansão da conta enterprise"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-company">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="size-4" />
                  Empresa
                </span>
              </label>
              <input
                id="deal-company"
                className={inputClassName}
                value={values.companyName}
                onChange={(event) =>
                  setValues((current) => ({ ...current, companyName: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-contact">
                Contato associado
              </label>
              <input
                id="deal-contact"
                className={inputClassName}
                value={values.contactName}
                onChange={(event) =>
                  setValues((current) => ({ ...current, contactName: event.target.value }))
                }
                placeholder="Nome do contato"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-contact-phone">
                <span className="inline-flex items-center gap-2">
                  <Phone className="size-4" />
                  Telefone do lead
                </span>
              </label>
              <input
                id="deal-contact-phone"
                className={inputClassName}
                value={values.contactPhone}
                onChange={(event) =>
                  setValues((current) => ({ ...current, contactPhone: event.target.value }))
                }
                placeholder="Ex.: +55 11 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-value">
                Valor previsto
              </label>
              <input
                id="deal-value"
                type="number"
                min="0"
                step="0.01"
                className={inputClassName}
                value={values.value}
                onChange={(event) =>
                  setValues((current) => ({ ...current, value: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-close-date">
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="size-4" />
                  Fechamento estimado
                </span>
              </label>
              <input
                id="deal-close-date"
                type="date"
                className={inputClassName}
                value={values.expectedCloseAt}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    expectedCloseAt: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-stage">
                Etapa do pipeline
              </label>
              <select
                id="deal-stage"
                className={inputClassName}
                value={values.stageId}
                onChange={(event) =>
                  setValues((current) => ({ ...current, stageId: event.target.value }))
                }
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="deal-owner">
                <span className="inline-flex items-center gap-2">
                  <UserRound className="size-4" />
                  Responsável
                </span>
              </label>
              <select
                id="deal-owner"
                className={inputClassName}
                value={values.ownerId}
                onChange={(event) =>
                  setValues((current) => ({ ...current, ownerId: event.target.value }))
                }
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-2">
            <label className="text-sm font-medium" htmlFor="deal-description">
              <span className="inline-flex items-center gap-2">
                <FileText className="size-4" />
                Descrição
              </span>
            </label>
            <textarea
              id="deal-description"
              rows={6}
              className="flex w-full rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Notas de contexto, objeções e próximos passos do negócio."
            />
          </section>

          {message ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground"
            >
              {message}
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border/70 px-6 py-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
                Excluir negócio
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Crie um novo card sem sair do quadro.
              </span>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Salvando..." : isEditing ? "Salvar negócio" : "Criar negócio"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
