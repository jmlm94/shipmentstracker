export const metadata = { title: "Sign in · Shipments Tracker" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6">
      <form action="/api/auth/login" method="POST" className="card w-full p-8">
        <h1 className="text-lg font-semibold">Team dashboard</h1>
        <p className="mt-1 text-sm text-muted">Enter the shared password.</p>
        <input type="hidden" name="next" value={searchParams.next || "/dashboard"} />
        <div className="mt-5">
          <label className="label">Password</label>
          <input className="input" type="password" name="password" autoFocus />
          {searchParams.error && <p className="err">Incorrect password. Try again.</p>}
        </div>
        <button type="submit" className="btn mt-5 w-full">
          Sign in
        </button>
      </form>
    </main>
  );
}
