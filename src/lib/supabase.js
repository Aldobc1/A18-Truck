import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlrmqadrfusrjzwgmlng.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscm1xYWRyZnVzcmp6d2dtbG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTM2OTIsImV4cCI6MjA3MDE2OTY5Mn0.v5YADhuar29Ps-XvXxClQR5taUOyGyfOs5HEx7p37PM';

if (SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>') {
  throw new Error('Missing Supabase variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export default supabase;