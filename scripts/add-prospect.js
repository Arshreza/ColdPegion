const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" });

async function main() {
  // Show Prospect columns
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'Prospect' ORDER BY ordinal_position"
  );
  console.log("Prospect columns:");
  cols.rows.forEach(c => console.log("  -", c.column_name));

  // Check if vazirmarine already exists
  const existing = await pool.query('SELECT id, email FROM "Prospect" WHERE email = $1', ["vazirmarine@gmail.com"]);
  if (existing.rows.length > 0) {
    console.log("\n✓ Prospect already exists:", existing.rows[0].id);
  } else {
    // Get user id
    const user = await pool.query('SELECT id FROM "User" LIMIT 1');
    const userId = user.rows[0].id;

    const ins = await pool.query(
      `INSERT INTO "Prospect" (id, "userId", email, "firstName", "lastName", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [userId, "vazirmarine@gmail.com", "Vazir", "Marine"]
    );
    console.log("\n✅ Created prospect:", ins.rows[0].id);
  }

  await pool.end();
}
main().catch(console.error);
