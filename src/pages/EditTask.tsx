import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, AlertTriangle, Zap, Footprints, Save } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { getEndOfDay } from '../utils/dateUtils';

const EditTask = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks, updateTask, loading: loadingTasks } = useTasks();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    importance: 'medium' as 'low' | 'medium' | 'high',
    resistance: 'medium' as 'low' | 'medium' | 'high',
    due_date_type: 'custom',
    custom_due_date: '',
    first_step: '',
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!loadingTasks) {
      const task = tasks.find(t => t.id === id);
      if (task) {
        setFormData({
          title: task.title,
          importance: task.importance,
          resistance: task.resistance,
          due_date_type: 'custom',
          custom_due_date: task.current_due_date ? task.current_due_date.split('T')[0] : '',
          first_step: task.first_step || '',
        });
      }
    }
  }, [id, tasks, loadingTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dueDateIso = getEndOfDay(formData.custom_due_date);
      const dueDate = new Date(dueDateIso);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      if (dueDate < startOfToday) {
        alert('過去の日付は設定できません。今日以降の日付を選択してください。');
        setLoading(false);
        return;
      }

      await updateTask(id!, {
        title: formData.title,
        importance: formData.importance,
        resistance: formData.resistance,
        first_step: formData.first_step,
        current_due_date: dueDate.toISOString(),
      });

      navigate(`/task/${id}`);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('タスクの更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTasks) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">タスク内容の修正</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <section className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            なにをやりますか？ <span className="text-destructive font-normal text-[10px]">必須</span>
          </label>
          <input
            type="text"
            required
            className="w-full bg-card border border-border p-4 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
            placeholder="タスクの名前を入力..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </section>

        {/* Due Date */}
        <section className="space-y-4">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> 期限はいつまで？
          </label>
          <input
            type="date"
            required
            className="w-full bg-card border border-border p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary"
            value={formData.custom_due_date}
            min={today}
            onChange={(e) => setFormData({ ...formData, custom_due_date: e.target.value })}
          />
        </section>

        {/* Priority & Resistance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <section className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 重要度
            </label>
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              {['low', 'medium', 'high'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormData({ ...formData, importance: v as any })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    formData.importance === v ? 'bg-white shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  {v === 'low' ? '低' : v === 'medium' ? '中' : '高'}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> 着手ハードル（抵抗感）
            </label>
            <div className="flex gap-2 p-1 bg-secondary rounded-xl">
              {['low', 'medium', 'high'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormData({ ...formData, resistance: v as any })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    formData.resistance === v 
                      ? (v === 'low' ? 'bg-resistance-low text-white shadow-md' : v === 'medium' ? 'bg-resistance-medium text-white shadow-md' : 'bg-resistance-high text-white shadow-md')
                      : 'text-muted-foreground'
                  }`}
                >
                  {v === 'low' ? '楽勝' : v === 'medium' ? '普通' : '重い'}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* First Step */}
        <section className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Footprints className="w-4 h-4 text-green-500" /> 最初の一歩（5分でできること）
          </label>
          <textarea
            className="w-full bg-card border border-border p-4 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm h-24"
            placeholder="例：パソコンの前に座ってファイルを開く"
            value={formData.first_step}
            onChange={(e) => setFormData({ ...formData, first_step: e.target.value })}
          />
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? '更新中...' : (
            <>
              <Save className="w-5 h-5" />
              変更を保存する
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default EditTask;
