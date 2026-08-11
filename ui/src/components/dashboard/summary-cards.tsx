"use client";

import { useQuery } from "@tanstack/react-query";
import { getSummary } from "@/lib/api/endpoints";
import { queryKeys } from "@/lib/api/query-keys";
import { errorMessage } from "@/lib/errors";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownRight,
  ArrowUpRight,
  RotateCw,
  Scale,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "income" | "expense" | "neutral";

const toneStyles: Record<Tone, { tile: string; text: string }> = {
  income: {
    tile: "bg-income/10 text-income ring-1 ring-income/20",
    text: "text-income",
  },
  expense: {
    tile: "bg-expense/10 text-expense ring-1 ring-expense/20",
    text: "text-expense",
  },
  neutral: {
    tile: "bg-muted text-foreground/70 ring-1 ring-foreground/5",
    text: "text-foreground",
  },
};

export function SummaryCards() {
  const summary = useQuery({
    queryKey: queryKeys.summary,
    queryFn: getSummary,
  });

  if (summary.isPending) {
    return <SummarySkeleton />;
  }

  if (summary.isError) {
    return (
      <Card className="flex items-center gap-3 p-5">
        <TriangleAlert
          className="size-4 shrink-0 text-expense"
          aria-hidden
        />
        <p className="flex-1 text-sm">
          {errorMessage(summary.error, "Não foi possível carregar o resumo.")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void summary.refetch()}
        >
          <RotateCw className="size-3.5" aria-hidden />
          Tentar novamente
        </Button>
      </Card>
    );
  }

  const data = summary.data;
  const balanceTone: Tone = data.balanceCents >= 0 ? "income" : "expense";

  return (
    <section aria-label="Resumo financeiro">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Receitas"
          icon={ArrowUpRight}
          tone="income"
          value={formatBRL(data.totalIncomeCents)}
          delay={0}
        />
        <SummaryCard
          label="Despesas"
          icon={ArrowDownRight}
          tone="expense"
          value={formatBRL(data.totalExpenseCents)}
          delay={70}
        />
        <SummaryCard
          label="Saldo"
          icon={Scale}
          tone={balanceTone}
          value={formatBRL(data.balanceCents)}
          delay={140}
        />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  icon: Icon,
  tone,
  value,
  delay,
}: {
  label: string;
  icon: LucideIcon;
  tone: Tone;
  value: string;
  delay: number;
}) {
  const styles = toneStyles[tone];
  return (
    <Card
      className="animate-rise p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-2 truncate font-display text-2xl font-medium tracking-tight tabular-nums sm:text-[1.7rem]",
              styles.text,
            )}
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            styles.tile,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <section aria-label="Resumo financeiro" aria-busy>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-32" />
          </Card>
        ))}
      </div>
    </section>
  );
}
