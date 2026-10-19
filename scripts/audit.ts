import dotenv from 'dotenv';
dotenv.config();

import { env } from '../src/config/env.ts';
import { supabase, isSupabaseConfigured } from '../src/config/supabase.ts';
import { GoogleGenAI } from '@google/genai';
import { runAutomatedTests } from '../src/tests/agent.test.ts';

async function audit() {
  console.log('=== AUDIT ITEM 1 & 2: ENVIRONMENT VARIABLES & SUPABASE CREDENTIALS ===');
  console.log('NODE_ENV:', env.NODE_ENV);
  console.log('PORT:', env.PORT);
  console.log('GEMINI_MODEL:', env.GEMINI_MODEL);
  console.log('GEMINI_API_KEY set?:', Boolean(env.GEMINI_API_KEY), 'Length:', env.GEMINI_API_KEY?.length || 0);
  console.log('SUPABASE_URL set?:', Boolean(env.SUPABASE_URL), 'Value (masked):', env.SUPABASE_URL ? env.SUPABASE_URL.replace(/:\/\/([^.]+)\./, '://***.') : '<not set>');
  console.log('SUPABASE_SECRET_KEY set?:', Boolean(env.SUPABASE_SECRET_KEY), 'Length:', env.SUPABASE_SECRET_KEY?.length || 0);
  console.log('isSupabaseConfigured():', isSupabaseConfigured());

  console.log('\n=== AUDIT ITEM 3 & 4: REAL SUPABASE QUERY & INSERT/READ/DELETE ===');
  if (isSupabaseConfigured() && supabase) {
    try {
      console.log('Attempting Supabase query on profiles or incidents...');
      const { data, error } = await supabase.from('incidents').select('id, title').limit(3);
      if (error) {
        console.log('Supabase query error:', error.message);
      } else {
        console.log('Supabase query succeeded. Records found:', data?.length);
      }

      console.log('Attempting controlled insert/read/delete on profiles...');
      const testId = '00000000-0000-0000-0000-000000000099';
      const { error: insErr } = await supabase.from('profiles').upsert({
        id: testId,
        email: 'audit-test@incidentiq.internal',
        full_name: 'Audit Test Record',
        role: 'sre_engineer',
      });
      if (insErr) {
        console.log('Supabase insert failed:', insErr.message);
      } else {
        console.log('Supabase insert succeeded.');
        const { data: readData, error: readErr } = await supabase.from('profiles').select('*').eq('id', testId).single();
        console.log('Supabase read:', readErr ? readErr.message : 'Success: ' + readData?.email);
        const { error: delErr } = await supabase.from('profiles').delete().eq('id', testId);
        console.log('Supabase delete:', delErr ? delErr.message : 'Success');
      }

      // Check all 12 tables
      const expectedTables = [
        'profiles', 'incidents', 'incident_logs', 'runbooks',
        'investigation_runs', 'investigation_hypotheses', 'investigation_evidence',
        'remediation_proposals', 'remediation_approvals', 'remediation_actions',
        'verification_results', 'audit_events'
      ];
      console.log('\nChecking existence of 12 tables in Supabase...');
      for (const t of expectedTables) {
        const { error: tErr } = await supabase.from(t).select('id').limit(1);
        console.log(`Table ${t}: ${tErr ? 'NOT ACCESSIBLE / ' + tErr.message : 'EXISTS & ACCESSIBLE'}`);
      }
    } catch (e: any) {
      console.log('Exception in Supabase testing:', e.message);
    }
  } else {
    console.log('Supabase is NOT configured with live credentials in this runtime environment.');
    console.log('State is managed by resilient local state store initialized with synthetic SRE fixtures.');
  }

  console.log('\n=== AUDIT ITEM 6: GEMINI API CALL VERIFICATION ===');
  if (env.GEMINI_API_KEY) {
    try {
      console.log('Testing live Gemini call with model:', env.GEMINI_MODEL);
      const ai = new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const res = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: 'Ping SRE health check. Output JSON: {"status": "ok"}',
        config: { responseMimeType: 'application/json' },
      });
      console.log('Gemini live response:', res.text?.trim());
    } catch (gErr: any) {
      console.log('Gemini call failed:', gErr.message);
    }
  } else {
    console.log('GEMINI_API_KEY is not set in environment.');
  }

  console.log('\n=== AUDIT ITEM 7 & 8: RUNNING AUTOMATED TEST SUITE ===');
  const testReport = await runAutomatedTests();
  console.log(`Suite status: ${testReport.suite_status} (${testReport.passed_tests}/${testReport.total_tests} passed)`);
  for (const t of testReport.results) {
    console.log(`- [${t.passed ? 'PASS' : 'FAIL'}] ${t.id}: ${t.name} (${t.duration_ms}ms)`);
    if (!t.passed) {
      console.log(`    Expected: ${t.expected}`);
      console.log(`    Actual: ${t.actual}`);
    }
  }
}

audit().catch(console.error);
