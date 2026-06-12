const nodemailer = require("nodemailer");

async function sendTestEmail() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "mohammed.taqi@snshipspares.com",
      pass: "dxocuilmvamassvt",
    },
  });

  console.log("Connecting to Gmail SMTP...");

  const info = await transporter.sendMail({
    from: '"Mohammed Taqi — SN Ship Spares" <mohammed.taqi@snshipspares.com>',
    to: "vazirmarine@gmail.com",
    subject: "ColdPegion — First Live Email 🚀",
    text: [
      "Hi there,",
      "",
      "This is the very first email sent by ColdPegion from our local development environment.",
      "",
      "If you're reading this, it means the entire email pipeline is working:",
      "  ✓ Gmail SMTP authenticated successfully",
      "  ✓ Nodemailer transport connected",
      "  ✓ Email delivered to inbox",
      "",
      "Next step: Hook this into the AI agent so it generates personalized cold emails automatically.",
      "",
      "Best regards,",
      "Mohammed Taqi",
      "SN Ship Spares",
      "",
      "---",
      "Sent via ColdPegion v0.1.0",
    ].join("\n"),
  });

  console.log("✅ Email sent successfully!");
  console.log("   Message ID:", info.messageId);
  console.log("   To: vazirmarine@gmail.com");
  console.log("   From: mohammed.taqi@snshipspares.com");
}

sendTestEmail().catch((err) => {
  console.error("❌ Failed to send email:");
  console.error(err.message);
  process.exit(1);
});
