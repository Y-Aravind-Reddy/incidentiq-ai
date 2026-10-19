import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

async function testSDK() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: key,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
  const start = Date.now();
  console.log('Calling ai.models.generateContent with gemini-3.8-flash...');
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping SRE test. Output JSON: {"status": "ok"}',
      config: { responseMimeType: 'application/json' },
    });
    console.log(`SDK call succeeded in ${Date.now() - start}ms:`, res.text);
  } catch (err: any) {
    console.error('SDK error:', err.message);
  }
}

testSDK();
