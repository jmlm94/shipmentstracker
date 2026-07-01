/* Runs Prisma migrations during the Vercel build.
 *
 * Normal case: `prisma migrate deploy` applies any pending migrations.
 *
 * First deploy after switching from `db push` to migrations: the database
 * already has all the tables but no _prisma_migrations history, so deploy
 * fails with P3005 ("database schema is not empty"). In that case we mark the
 * baseline migration as already applied (it describes the schema `db push`
 * created) and deploy again so only newer migrations run.
 *
 * Any other failure exits non-zero on purpose: a failed deploy keeps the old
 * version live, which is safer than silently drifting the schema.
 */
const { execSync } = require("node:child_process");

const BASELINE = "20260701000000_init";

function run(cmd) {
  console.log(`[migrate] ${cmd}`);
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}

try {
  console.log(run("npx prisma migrate deploy"));
} catch (err) {
  const out = `${err.stdout || ""}${err.stderr || ""}`;
  console.error(out);
  if (out.includes("P3005")) {
    console.log("[migrate] Existing database without migration history — baselining.");
    console.log(run(`npx prisma migrate resolve --applied ${BASELINE}`));
    console.log(run("npx prisma migrate deploy"));
  } else {
    console.error("[migrate] Migration failed — aborting build so the old deploy stays live.");
    process.exit(1);
  }
}
