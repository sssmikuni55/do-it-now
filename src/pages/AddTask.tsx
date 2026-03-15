import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, AlertTriangle, Zap, Footprints, Save } from 'lucide-react';
import { supabase } from '../utils/supabase';

const AddTask = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    importance: 'medium',
    resistance: 'medium',
    due_date_type: 'today',
    custom_due_date: '',
    first_step: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate due date
      let dueDate = new Date();
      if (formData.due_date_type === 'today') {
        dueDate.setHours(23, 59, 59, 0);
      } else if (formData.due_date_type === 'tomorrow') {
        dueDate.setDate(dueDate.getDate() + 1);
        dueDate.setHours(23, 59, 59, 0);
      } else if (formData.due_date_type === 'week') {
        dueDate.setDate(dueDate.getDate() + 7);
        dueDate.setHours(23, 59, 59, 0);
      } else if (formData.due_date_type === 'month') {
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setHours(23, 59, 59, 0);
      } else if (formData.due_date_type === 'custom' && formData.custom_due_date) {
        dueDate = new Date(formData.custom_due_date);
        dueDate.setHours(23, 59, 59, 0);
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('ログインが必要です（デモ版では一旦ログイン画面へ誘導します）');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('tasks').insert([
        {
          user_id: user.id,
          title: formData.title,
          importance: formData.importance,
          resistance: formData.resistance,
          first_step: formData.first_step,
          original_due_date: dueDate.toISOString(),
          current_due_date: dueDate.toISOString(),
          status: 'todo',
        },
      ]);

      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error saving task:', error);
      alert('タスクの保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">新規タスク登録</h2>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['today', 'tomorrow', 'week', 'month', 'custom'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, due_date_type: type })}
                className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                  formData.due_date_type === type
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                {type === 'today' && '今日'}
                {type === 'tomorrow' && '明日'}
                {type === 'week' && '1週間'}
                {type === 'month' && '1ヶ月'}
                {type === 'custom' && '日付指定'}
              </button>
            ))}
          </div>

          {formData.due_date_type === 'custom' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <input
                type="date"
                required
                className="w-full bg-card border border-border p-4 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                value={formData.custom_due_date}
                onChange={(e) => setFormData({ ...formData, custom_due_date: e.target.value })}
              />
            </div>
          )}
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
                  onClick={() => setFormData({ ...formData, importance: v })}
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
                  onClick={() => setFormData({ ...formData, resistance: v })}
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
          {loading ? '保存中...' : (
            <>
              <Save className="w-5 h-5" />
              タスクを登録する
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddTask;
