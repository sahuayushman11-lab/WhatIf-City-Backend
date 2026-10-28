import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    client = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Successfully connected to PostgreSQL instance.');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client. Falling back to local in-memory store.');
  }
} else {
  console.log('[WhatIf City] Running with built-in in-memory guest repository (No external DB needed for hackathon demo).');
}

export const getSupabaseClient = () => client;
