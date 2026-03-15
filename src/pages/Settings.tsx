import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { User, LogOut, Shield, Info, Bell } from 'lucide-react';

const Settings = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold px-1">設定</h2>

      {/* Profile Section */}
      <section className="bg-card rounded-3xl border border-border overflow-hidden p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Logged in as</p>
            <p className="font-bold truncate">{user?.email || 'Loading...'}</p>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-border">
          <div className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span>プライバシー設定</span>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold">有効</span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span>通知 (ブラウザ送信)</span>
            </div>
            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-bold">準備中</span>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-card rounded-3xl border border-border p-6 space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Info className="w-3 h-3" /> アプリケーション情報
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">バージョン</span>
            <span className="font-mono">1.0.0-PRO</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            このアプリは、あなたの成功を願って開発されました。先延ばしは技術で解決できます。一歩ずつ進みましょう。
          </p>
        </div>
      </section>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full py-4 bg-destructive/10 text-destructive font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-destructive hover:text-white transition-all active:scale-[0.98]"
      >
        <LogOut className="w-5 h-5" />
        ログアウト
      </button>

      <div className="text-center py-10 opacity-30 select-none">
        <h1 className="text-4xl font-black italic">DO IT NOW</h1>
      </div>
    </div>
  );
};

export default Settings;
