import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, PieChart, MessageCircle, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useTasks } from '../hooks/useTasks';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ExcuseLog {
  id: string;
  reason_category: string;
  detail: string;
  created_at: string;
  tasks: {
    id: string;
    title: string;
  };
}

const Stats = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ExcuseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { deleteTask } = useTasks();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('excuse_logs')
      .select(`
        id,
        reason_category,
        detail,
        created_at,
        tasks (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (!error) setLogs(data as any || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteTask(deleteConfirmId);
      setDeleteConfirmId(null);
      fetchLogs(); // 削除後に再読み込み
    }
  };

  const reasonCounts = logs.reduce((acc: any, log) => {
    acc[log.reason_category] = (acc[log.reason_category] || 0) + 1;
    return acc;
  }, {});

  const sortedReasons = Object.entries(reasonCounts).sort((a: any, b: any) => b[1] - a[1]);

  if (loading) return <div className="p-8 text-center">分析中...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold">振り返り</h2>
      </div>

      {logs.length === 0 ? (
        <div className="bg-card p-12 rounded-3xl border border-border text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <PieChart className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground">まだ先延ばしの記録がありません。<br />順調な証拠ですね！</p>
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <section className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
            <h3 className="text-sm font-medium opacity-80 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> 先延ばしの原因
            </h3>
            <div className="space-y-4">
              {sortedReasons.slice(0, 3).map(([reason, count]: any, i) => (
                <div key={reason} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{i + 1}. {reason}</span>
                    <span>{count}回</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full" 
                      style={{ width: `${(count / logs.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Log List */}
          <section className="space-y-4">
            <h3 className="font-bold flex items-center gap-2 px-1">
              <MessageCircle className="w-5 h-5 text-primary" /> 過去の履歴
            </h3>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-card p-5 rounded-2xl border border-border shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded">
                      {log.reason_category}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">「{log.tasks?.title}」</p>
                    <button 
                      onClick={() => setDeleteConfirmId(log.tasks?.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {log.detail && (
                    <p className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-xl italic">
                      "{log.detail}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <ConfirmDialog 
        isOpen={!!deleteConfirmId}
        title="履歴とタスクの削除"
        message="この履歴に紐付くタスク本体も削除されます。よろしいですか？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default Stats;
