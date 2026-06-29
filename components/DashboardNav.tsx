"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  ScanLine,
  Clock,
  Tags,
  FileText,
  Download,
  MessageCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Purchase Orders", icon: ClipboardList },
  { href: "/dashboard/shipments", label: "Shipments", icon: Truck },
  { href: "/dashboard/receive", label: "Receive", icon: ScanLine },
  { href: "/dashboard/expected", label: "Expected", icon: Clock },
  { href: "/dashboard/products", label: "Products", icon: Tags },
  { href: "/dashboard/assistant", label: "Assistant", icon: MessageCircle },
  { href: "/dashboard/form", label: "Smart Form", icon: FileText },
  { href: "/dashboard/export", label: "Export", icon: Download },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`nav-item ${active ? "nav-item-active" : ""}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SignOut({ disabled }: { disabled: boolean }) {
  if (disabled) return null;
  return (
    <form action="/api/auth/logout" method="POST" className="mt-2">
      <button className="nav-item w-full text-slate-500">
        <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
        Sign out
      </button>
    </form>
  );
}

export function DashboardNav({ authDisabled }: { authDisabled: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white/80 px-3 py-5 backdrop-blur lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <Logo className="h-8 w-8" />
          <span className="text-[15px] font-bold tracking-tight text-ink">Carbinox</span>
        </Link>
        <NavLinks />
        <SignOut disabled={authDisabled} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-bold tracking-tight text-ink">Carbinox</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white px-3 py-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="flex items-center gap-2">
                <Logo className="h-7 w-7" />
                <span className="font-bold tracking-tight text-ink">Carbinox</span>
              </span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <SignOut disabled={authDisabled} />
          </div>
        </div>
      )}
    </>
  );
}
