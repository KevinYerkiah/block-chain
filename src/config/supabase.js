import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lwpgevacshnlmyexyuhm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hutvqchdXl2isJ-oI7i8iA_iUyO3KyZ';

// Memory-only storage — XSS cannot steal tokens from a JS variable.
// Tradeoff: page refresh = re-login. For a confession platform this is a feature.
const memoryStorage = {
    _store: {},
    getItem(key) {
        return this._store[key] ?? null;
    },
    setItem(key, value) {
        this._store[key] = value;
    },
    removeItem(key) {
        delete this._store[key];
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        flowType: 'pkce',
        storage: memoryStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: false,
    },
});
