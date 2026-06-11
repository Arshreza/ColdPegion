// Register the real Gmail account in the DB so agents can use it
const crypto = require("crypto");
const { Pool } = require("pg");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ENCRYPTION_KEY = "ee6b852491191d9f7ed30584647d47ea55821439a433485b057815017f9b998e";

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

const DATABASE_URL = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  // Get the test user
  const userRes = await pool.query('SELECT id, email FROM "User" LIMIT 1');
  if (userRes.rows.length === 0) {
    console.error("No user found in DB! Login to the app first.");
    return;
  }
  const user = userRes.rows[0];
  console.log("Found user:", user.email);

  const encryptedPassword = encrypt("dxocuilmvamassvt");

  // Check if this account already exists
  const existing = await pool.query(
    'SELECT id FROM "EmailAccount" WHERE "emailAddress" = $1',
    ["mohammed.taqi@snshipspares.com"]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE "EmailAccount" SET "gmailAppPassword" = $1, status = $2, "displayName" = $3 WHERE id = $4',
      [encryptedPassword, "CONNECTED", "Mohammed Taqi", existing.rows[0].id]
    );
    console.log("✅ Updated existing account with real credentials. ID:", existing.rows[0].id);
  } else {
    // Remove dummy accounts
    const del = await pool.query(
      'DELETE FROM "EmailAccount" WHERE "userId" = $1 AND "emailAddress" != $2',
      [user.id, "mohammed.taqi@snshipspares.com"]
    );
    if (del.rowCount > 0) console.log(`Removed ${del.rowCount} dummy account(s).`);

    const ins = await pool.query(
      `INSERT INTO "EmailAccount" (id, "userId", provider, "emailAddress", "displayName", "gmailAppPassword", status, "dailyLimit", "sentToday", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'GMAIL', $2, $3, $4, 'CONNECTED', 50, 0, NOW(), NOW())
       RETURNING id`,
      [user.id, "mohammed.taqi@snshipspares.com", "Mohammed Taqi", encryptedPassword]
    );
    console.log("✅ Created real Gmail account in DB. ID:", ins.rows[0].id);
  }

  // Create prospect for vazirmarine@gmail.com
  const prospectRes = await pool.query(
    'SELECT id FROM "Prospect" WHERE email = $1 AND "userId" = $2',
    ["vazirmarine@gmail.com", user.id]
  );

  if (prospectRes.rows.length === 0) {
    const pIns = await pool.query(
      `INSERT INTO "Prospect" (id, "userId", email, "firstName", "lastName", company, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [user.id, "vazirmarine@gmail.com", "Vazir", "Marine", "Vazir Marine Services"]
    );
    console.log("✅ Created prospect: vazirmarine@gmail.com. ID:", pIns.rows[0].id);
  } else {
    console.log("✓ Prospect already exists:", prospectRes.rows[0].id);
  }

  console.log("\n✅ Done! Your real Gmail account is now registered in ColdPigeon.");
  await pool.end();
}

main().catch(console.error);
