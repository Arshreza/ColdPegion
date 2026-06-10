const { OpenAI } = require("openai");

const openai = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: "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",
});

async function test() {
  console.log("Testing Groq API...\n");
  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "You are a sales email writer." },
        { role: "user", content: "Write a one-line subject for selling cryogenic pumps." }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });
    console.log("✅ Groq API WORKS!");
    console.log("Model:", completion.model);
    console.log("Response:", completion.choices[0].message.content);
  } catch (err) {
    console.error("❌ FAILED");
    console.error("Status:", err.status);
    console.error("Message:", err.message);
    if (err.error) console.error("Error:", JSON.stringify(err.error, null, 2));
  }
}

test();
