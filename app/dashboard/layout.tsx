import { redirect } from "next/navigation";
import { authDisabled, isAuthed } from "@/lib/auth";
import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAuthed()) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <DashboardNav authDisabled={authDisabled()} />
      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="animate-fade-in-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
