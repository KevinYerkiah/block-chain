import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const subscribed = useRef(false);

    useEffect(() => {
        if (subscribed.current) return;
        subscribed.current = true;

        const timeout = setTimeout(() => setLoading(false), 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                clearTimeout(timeout);

                if (event === 'SIGNED_OUT' || !session) {
                    setUser(null);
                    setLoading(false);
                    return;
                }

                try {
                    const { data: profile, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (error) throw error;
                    setUser(profile);
                } catch (err) {
                    console.warn('Profile fetch failed:', err.message);
                    await supabase.auth.signOut();
                    setUser(null);
                } finally {
                    setLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
            subscribed.current = false;
            clearTimeout(timeout);
        };
    }, []);

    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email, password, username, displayName) => {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            username,
            display_name: displayName,
            email,
            password_hash: 'managed_by_supabase',
            dh_public_key: 'dh_placeholder',
            avatar_index: Math.floor(Math.random() * 9) + 1,
            cover_color: ['#FFDDD2','#D4E8C2','#C9E4DE','#D6D0F0','#FAE1C3','#C5D8F0','#F5C6D0','#D0EAD0'][Math.floor(Math.random() * 8)],
        });

        if (profileError) throw profileError;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
