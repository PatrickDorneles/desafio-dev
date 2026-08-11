"use client";

import { useSession } from "@/hooks/use-session";
import type { UserProfile } from "@/lib/schemas";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Plus, Tags } from "lucide-react";

interface DashboardHeaderProps {
  user: UserProfile;
  onNewTransaction: () => void;
  onManageCategories: () => void;
}

export function DashboardHeader({
  user,
  onNewTransaction,
  onManageCategories,
}: DashboardHeaderProps) {
  const { logout } = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5 sm:px-8 lg:px-10">
        <BrandMark />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onManageCategories}
            aria-label="Gerenciar categorias"
          >
            <Tags className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Gerenciar categorias</span>
          </Button>

          <Button size="sm" onClick={onNewTransaction}>
            <Plus className="size-3.5" aria-hidden />
            Nova movimentação
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              data-slot="dashboard-user-menu"
              className="-mr-2 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/25"
              >
                {initials(user.name)}
              </span>
              <span className="hidden max-w-28 truncate font-medium sm:block">
                {user.name}
              </span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
              <span className="sr-only">Menu do usuário</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>
                <span className="block max-w-40 truncate text-xs font-medium">
                  {user.email}
                </span>
                <span className="block font-medium">{user.name}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={logout}>
                <LogOut aria-hidden />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/** `Ana Souza` → `AS` — used for the avatar circle. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
