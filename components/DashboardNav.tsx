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
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink px-3 py-5 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center px-2 text-white">
          <Logo className="h-5 w-auto" />
        </Link>
        <NavLinks />
        <SignOut disabled={authDisabled} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center text-white">
          <Logo className="h-5 w-auto" />
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-slate-300 hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-ink px-3 py-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between px-2 text-white">
              <Logo className="h-5 w-auto" />
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-white/10">
                <X className="h-5 w-5 text-slate-300" />
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
