import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { User, LogOut, Shield, Info, Bell, HelpCircle, ChevronRight } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
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

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    checkPushSubscription();
  }, []);

  const checkPushSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setIsPushEnabled(!!subscription);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (isPushEnabled) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          // Supabase から削除
          const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
          if (error) {
            console.error('Delete failed:', error);
            throw new Error('通知解除の保存に失敗しました。');
          }
        }
        setIsPushEnabled(false);
      } else {
        // Subscribe
        const registration = await navigator.serviceWorker.ready;
        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        // Supabase に保存
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('ログイン状態が確認できません。一度ログアウトして再度ログインしてください。');
        }

        const keys = subscription.toJSON().keys;
        const { error: insertError } = await supabase.from('push_subscriptions').insert([{
          user_id: user.id,
          endpoint: subscription.endpoint,
          auth_key: keys?.auth,
          p256dh_key: keys?.p256dh
        }]);

        if (insertError) {
          console.error('Insert failed:', insertError);
          throw new Error(`送信先の保存に失敗しました: ${insertError.message}`);
        }

        setIsPushEnabled(true);
      }
    } catch (err: any) {
      console.error('Push operation failed:', err);
      alert(err.message || '通知の設定に失敗しました。ブラウザの設定で通知が許可されているか確認してください。');
      // 状態を再確認
      await checkPushSubscription();
    } finally {
      setPushLoading(false);
    }
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
            <button
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                isPushEnabled 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {pushLoading ? '中...' : isPushEnabled ? '有効' : '無効'}
            </button>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-card rounded-3xl border border-border p-6 space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" /> アプリケーション情報
          </div>
        </h3>
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/guide')}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">使い方ガイド</p>
                <p className="text-[10px] text-muted-foreground">アプリの理念と操作方法を確認</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">バージョン</span>
              <span className="font-mono text-xs">1.0.0-PRO</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              このアプリは、あなたの成功を願って開発されました。先延ばしは技術で解決できます。一歩ずつ進みましょう。
            </p>
          </div>
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
