import "dotenv/config";

async function triggerVercelMail() {
  const targetEmail = "rhemanthjeyanezsingh@karunya.edu.in";
  console.log(`🚀 Dispatching all 13 test emails to ${targetEmail} via Vercel Cloud Service...`);

  try {
    const response = await fetch(`https://kairos-production-lms.vercel.app/api/test-emails?email=${encodeURIComponent(targetEmail)}`);
    const data = await response.json();
    console.log("✅ Vercel Dispatch Response:", data);
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Failed to trigger email service:", err?.message || err);
    process.exit(1);
  }
}

triggerVercelMail();
