import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { logout } from "@/lib/auth.functions";

type NavItem = { to: string; label: string };

export function AppShell({
  children,
  nav,
  user,
}: {
  children: ReactNode;
  nav: NavItem[];
  user?: { name: string; detail?: string } | null;
}) {
  const navigate = useNavigate();
  const signOut = useServerFn(logout);
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
              28
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-semibold">Student Support Hub</span>
              <span className="block text-xs text-muted-foreground">HSC 28 · 10 Minute School</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground [&.active]:bg-elevated [&.active]:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-right text-xs leading-tight sm:block">
                <span className="block font-medium">{user.name}</span>
                {user.detail ? (
                  <span className="block text-muted-foreground">{user.detail}</span>
                ) : null}
              </span>
              <button
                className="btn-ghost text-sm"
                onClick={async () => {
                  await signOut({});
                  queryClient.clear();
                  navigate({ to: "/" });
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <Link to="/" className="btn-ghost text-sm">
              Log in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
