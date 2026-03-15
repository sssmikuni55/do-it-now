import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// デバッグ・検証用: URLに dev=true がある場合に認証とDB操作をバイパスする仕組み
if (typeof window !== 'undefined' && window.location.search.includes('dev=true')) {
  supabase.auth.getUser = async () => {
    return { data: { user: { id: '00000000-0000-0000-0000-000000000000', email: 'dev@example.com' } as any }, error: null };
  };

  // メモリ内でタスク状態を保持するように変更
  let mockTasks = [
    {
      id: '1',
      title: 'Review Project Docs',
      importance: 'high',
      resistance: 'high',
      first_step: 'Open the browser and go to docs',
      current_due_date: new Date(Date.now() + 3600000).toISOString(), // 1時間後に設定して即モーダルが出るのを防ぐ
      status: 'todo',
      created_at: new Date().toISOString(),
    }
  ];

  supabase.from = ((table: string) => {
    if (table === 'tasks') {
      return {
        select: () => ({ 
          order: () => ({ data: [...mockTasks].reverse(), error: null }), // 新しい順に見えるように
          eq: () => ({ data: mockTasks, error: null }),
          single: () => ({ data: mockTasks[0], error: null }) 
        }),
        insert: (data: any[]) => {
          const newTasks = data.map(item => ({
            id: Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            status: 'todo',
            ...item
          }));
          mockTasks = [...mockTasks, ...newTasks];
          return { error: null };
        },
        update: (updates: any) => {
          mockTasks = mockTasks.map(t => t.id === '1' || mockTasks.find(mt => mt.id === t.id) ? { ...t, ...updates } : t);
          return { eq: () => ({ error: null }) };
        },
        delete: () => ({ eq: () => ({ error: null }) }),
        upsert: () => ({ error: null }),
      } as any;
    }
    return {
      select: () => ({ order: () => ({ data: [], error: null }), eq: () => ({ data: [], error: null }) }),
      insert: () => ({ error: null }),
      update: () => ({ eq: () => ({ error: null }) }),
      delete: () => ({ eq: () => ({ error: null }) }),
      upsert: () => ({ error: null }),
    } as any;
  }) as any;
}
