import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

async function testFixes() {
  console.log('--- Testing Supabase URL normalization ---');
  let rawUrl = process.env.SUPABASE_URL || '';
  console.log('Raw SUPABASE_URL:', rawUrl);

  // If it's a project ref without https://, e.g. "zfdncxsqbcqrforvwnup"
  let formattedUrl = rawUrl.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    if (/^[a-z0-9_-]+$/i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}.supabase.co`;
    }
  }
  console.log('Formatted URL:', formattedUrl);
  const secretKey = process.env.SUPABASE_SECRET_KEY || '';

  try {
    const client = createClient(formattedUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log('Created Supabase client with formatted URL.');
    const { data, error } = await client.from('incidents').select('id, title').limit(2);
    if (error) {
      console.log('Supabase query error:', error.code, error.message, error.details);
    } else {
      console.log('SUCCESS! Real Supabase query returned rows:', data);
    }

    // Also check profiles
    const { data: profData, error: profErr } = await client.from('profiles').select('*').limit(2);
    console.log('Profiles table query:', profErr ? profErr.message : `Success (${profData.length} rows)`);

    // Check all 12 tables
    const expectedTables = [
      'profiles', 'incidents', 'incident_logs', 'runbooks',
      'investigation_runs', 'investigation_hypotheses', 'investigation_evidence',
      'remediation_proposals', 'remediation_approvals', 'remediation_actions',
      'verification_results', 'audit_events'
    ];
    for (const t of expectedTables) {
      const { error: tErr } = await client.from(t).select('*').limit(1);
      console.log(`Table "${t}": ${tErr ? 'Error: ' + tErr.message : 'EXISTS & ACCESSIBLE'}`);
    }
  } catch (e: any) {
    console.log('Supabase connection exception:', e.message);
  }

  console.log('\n--- Testing Gemini with gemini-3.8-flash ---');
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Ping SRE health check. Output JSON: {"status": "ok"}',
      config: { responseMimeType: 'application/json' },
    });
    console.log('Gemini 3.8 Flash response:', res.text?.trim());
  } catch (e: any) {
    console.log('Gemini 3.8 Flash exception:', e.message);
  }
}

testFixes().catch(console.error);
