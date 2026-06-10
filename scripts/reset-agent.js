const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" });

async function main() {
  // Reset agent to DRAFT so Launch Sequence button works
  const agents = await pool.query('UPDATE "Agent" SET status = $1, "sentToday" = 0 RETURNING id, name', ["DRAFT"]);
  agents.rows.forEach(a => console.log(`✅ Reset agent "${a.name}" to DRAFT`));

  // Clear failed email records so prospects become eligible again
  const deleted = await pool.query('DELETE FROM "Email" WHERE status = $1 RETURNING id', ["FAILED"]);
  console.log(`✅ Cleared ${deleted.rowCount} failed email records`);

  await pool.end();
}
main().catch(console.error);
