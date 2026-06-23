import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthed()) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link href="/dashboard" className="font-semibold">
              Shipments Tracker
            </Link>
            <nav className="flex items-center gap-x-4 text-sm text-muted">
              <Link href="/dashboard" className="hover:text-ink">
                Overview
              </Link>
              <Link href="/dashboard/shipments" className="hover:text-ink">
                Shipments
              </Link>
              <Link href="/dashboard/receive" className="hover:text-ink">
                Receive
              </Link>
              <Link href="/dashboard/products" className="hover:text-ink">
                Products
              </Link>
              <Link href="/dashboard/form" className="hover:text-ink">
                Smart form
              </Link>
              <a href="/api/export" className="hover:text-ink">
                Export CSV
              </a>
            </nav>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
