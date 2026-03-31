import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ivdfytudwtfqriwsyvov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2ZGZ5dHVkd3RmcXJpd3N5dm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjQwNjQsImV4cCI6MjA5MDE0MDA2NH0.COTBZGWB80JfYP9ly-K9fD9W9ts_2TZdgmDgNLlE5KU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});
