import dotenv from 'dotenv';
dotenv.config();

async function testFlashLatest() {
  const key = process.env.GEMINI_API_KEY;
  const start = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
    });
    const data = await res.json();
    console.log(`gemini-flash-latest status: ${res.status} in ${Date.now() - start}ms:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.substring(0, 50));
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testFlashLatest();
