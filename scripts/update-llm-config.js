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

const pool = new Pool({ connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable" });

async function main() {
  const user = await pool.query('SELECT id FROM "User" LIMIT 1');
  const userId = user.rows[0].id;

  const encryptedKey = encrypt("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");

  // Check if LLM config exists
  const existing = await pool.query('SELECT id FROM "LlmConfig" WHERE "userId" = $1', [userId]);

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE "LlmConfig" SET "apiBaseUrl" = $1, "modelName" = $2, "apiKey" = $3, "isValid" = true WHERE "userId" = $4',
      ["https://api.groq.com/openai/v1", "openai/gpt-oss-120b", encryptedKey, userId]
    );
    console.log("✅ Updated LLM config to Groq");
  } else {
    await pool.query(
      `INSERT INTO "LlmConfig" (id, "userId", "apiBaseUrl", "modelName", "apiKey", "isValid")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true)`,
      [userId, "https://api.groq.com/openai/v1", "openai/gpt-oss-120b", encryptedKey]
    );
    console.log("✅ Created LLM config with Groq");
  }

  // Also reset agent status to DRAFT so we can re-launch
  await pool.query('UPDATE "Agent" SET status = $1, "sentToday" = 0 WHERE "userId" = $2', ["DRAFT", userId]);
  console.log("✅ Reset agent status to DRAFT");

  // Delete any failed email records so prospects are eligible again
  const deleted = await pool.query('DELETE FROM "Email" WHERE status = $1', ["FAILED"]);
  console.log(`✅ Cleared ${deleted.rowCount} failed email records`);

  await pool.end();
  console.log("\nDone! Groq is configured. Go hit Launch Sequence!");
}

main().catch(console.error);
