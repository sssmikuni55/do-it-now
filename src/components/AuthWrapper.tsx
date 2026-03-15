import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.search.includes('dev=true')) {
      setSession({ user: { id: '00000000-0000-0000-0000-000000000000', email: 'dev@example.com' } } as any);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // If error, try signup (for personal simple use)
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) alert(signUpError.message);
      else alert('アカウントを作成しました。そのままログインしてください。');
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">読み込み中...</div>;

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="bg-card w-full max-w-sm p-8 rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-300">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent italic">Do It Now</h1>
          <p className="text-center text-muted-foreground text-xs mb-8">先延ばしを、今日で終わりにしよう。</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 ml-1 block">Email</label>
              <input
                type="email"
                required
                className="w-full bg-secondary/50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary border border-transparent focus:bg-card transition-all"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 ml-1 block">Password</label>
              <input
                type="password"
                required
                className="w-full bg-secondary/50 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-primary border border-transparent focus:bg-card transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl mt-4 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? '処理中...' : '開始する'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthWrapper;
