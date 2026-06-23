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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="font-semibold">
            Shipments Tracker
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
