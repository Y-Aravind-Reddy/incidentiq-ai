import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:');
      for (const m of data.models) {
        if (m.name.includes('gemini') || m.name.includes('flash')) {
          console.log('-', m.name, m.supportedGenerationMethods);
        }
      }
    } else {
      console.log('No models list returned:', data);
    }
  } catch (err: any) {
    console.error('List models error:', err.message);
  }
}

listModels();
