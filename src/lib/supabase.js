import { createClient } from '@supabase/supabase-js';

// Usar URL y clave anónima correctas desde Supabase
const SUPABASE_URL = 'https://qbfldraashmolvnwqtft.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZmxkcmFhc2htb2x2bndxdGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTg5NzUsImV4cCI6MjA3MDUzNDk3NX0.6vsSm50CkJtdClG0yiVzbo6AM9PajNM1QKdvnmRA7F4';

// Validar que las variables de entorno estén configuradas
if (SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>') {
  throw new Error('Missing Supabase environment variables');
}

// Crear cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;