import { AuthCard } from "@/components/auth/auth-card";
import { BrandMark } from "@/components/brand-mark";
import { ArrowUpRight, ChartPie, Tags } from "lucide-react";

const features = [
  {
    icon: ArrowUpRight,
    title: "Receitas e despesas",
    description: "Registre entradas e saídas em segundos.",
  },
  {
    icon: Tags,
    title: "Categorias",
    description: "Organize cada lançamento e encontre tudo depois.",
  },
  {
    icon: ChartPie,
    title: "Saldo sempre à vista",
    description: "Resumo de receitas, despesas e saldo no topo do painel.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Ambient background: a calm navy wash — flat surfaces, no grain, no glow. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(58%_46%_at_72%_-6%,oklch(0.42_0.12_262/0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(42%_38%_at_4%_104%,oklch(0.3_0.07_262/0.16),transparent_70%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between py-7">
          <BrandMark />
          <p className="hidden text-xs tracking-wide text-muted-foreground/80 sm:block">
            Controle financeiro pessoal
          </p>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-12 py-12 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-20">
          <div className="animate-fade-in">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">
              Suas finanças, com clareza
            </p>
            <h1 className="mt-4 font-display text-[2.6rem] leading-[1.04] font-medium tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              Receitas e despesas, <span className="text-primary">em ordem.</span>
            </h1>
            <p className="mt-5 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Registre seus ganhos e gastos, organize tudo em categorias e
              acompanhe o saldo em um painel simples, sem firula.
            </p>

            <ul className="mt-10 space-y-2.5">
              {features.map((feature, index) => (
                <li
                  key={feature.title}
                  className="animate-rise flex items-center gap-3.5"
                  style={{ animationDelay: `${100 + index * 90}ms` }}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted/60 text-foreground/70 ring-1 ring-foreground/5">
                    <feature.icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {feature.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {feature.description}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-rise [animation-delay:180ms]">
            <AuthCard />
          </div>
        </section>

        <footer className="pb-7 pt-4 text-center text-xs text-muted-foreground/60">
          Fluxo · desafio técnico · pt-BR
        </footer>
      </div>
    </main>
  );
}
