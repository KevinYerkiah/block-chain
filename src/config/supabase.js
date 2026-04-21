import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lwpgevacshnlmyexyuhm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hutvqchdXl2isJ-oI7i8iA_iUyO3KyZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
    },
});

