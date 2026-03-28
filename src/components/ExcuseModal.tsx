import { useState } from 'react';
import { AlertCircle, Calendar, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '../utils/supabase';
import type { Task } from '../hooks/useTasks';

interface ExcuseModalProps {
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
  onComplete: (taskId: string) => Promise<void>;
}

const REASONS = [
  'やり方が分からなかった（難しすぎた）',
  '完璧にこなそうとして動けなかった',
  '体調や気分が乗らなかった',
  '他の急ぎの用事が割り込んできた',
  'ついSNSや動画を見てしまった',
  'タスクが重すぎて心理的な抵抗があった',
  'そもそもの期限設定が無理だった',
];

export const ExcuseModal: React.FC<ExcuseModalProps> = ({ task, onSuccess, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [reasonCategory, setReasonCategory] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [newDueDate, setNewDueDate] = useState('tomorrow');

  const handleComplete = async () => {
    setLoading(true);
    try {
      await onComplete(task.id);
      onSuccess();
    } catch (err) {
      console.error('Error completing task:', err);
      alert('完了処理に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let dueDate = new Date();
      if (newDueDate === 'tomorrow') {
        dueDate.setDate(dueDate.getDate() + 1);
        dueDate.setHours(23, 59, 59, 999);
      } else if (newDueDate === '3days') {
        dueDate.setDate(dueDate.getDate() + 3);
      } else if (newDueDate === 'week') {
        dueDate.setDate(dueDate.getDate() + 7);
      }

      const { error: logError } = await supabase.from('excuse_logs').insert([
        {
          task_id: task.id,
          reason_category: reasonCategory,
          detail: detail,
          delayed_from: task.current_due_date,
          delayed_to: dueDate.toISOString(),
        },
      ]);
      if (logError) throw logError;

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ current_due_date: dueDate.toISOString() })
        .eq('id', task.id);
      if (taskError) throw taskError;

      onSuccess();
    } catch (err) {
      console.error('Error saving excuse:', err);
      alert('保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
        <div className="bg-destructive/10 p-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-xl font-bold text-destructive">期限を過ぎています</h3>
          <p className="text-sm text-destructive/80 mt-1">「{task.title}」</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center gap-2">
              できなかった理由を選択してください
            </label>
            <select
              className="w-full bg-secondary p-4 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none border border-transparent appearance-none"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <textarea
              className="w-full bg-secondary p-4 rounded-2xl text-sm h-24 outline-none focus:ring-2 focus:ring-primary border border-transparent"
              placeholder="もう少し詳しく（自分へのメモ）"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter text-muted-foreground">
              <Calendar className="w-3 h-3 text-primary" /> 新しい期限を設定
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['tomorrow', '3days', 'week'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setNewDueDate(d)}
                  className={`py-3 rounded-2xl text-[10px] font-bold border transition-all ${
                    newDueDate === d 
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                      : 'bg-card border-border hover:bg-secondary'
                  }`}
                >
                  {d === 'tomorrow' ? '明日' : d === '3days' ? '3日後' : '1週間'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? '保存中...' : (
              <>
                <Save className="w-5 h-5" />
                再設定してやり直す
              </>
            )}
          </button>

          <div className="relative py-2 text-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-card px-2 relative z-10">OR</span>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-border"></div>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            disabled={loading}
            className="w-full py-4 bg-green-500/10 text-green-600 border border-green-500/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            実はもう終わっている
          </button>
        </form>
      </div>
    </div>
  );
};
