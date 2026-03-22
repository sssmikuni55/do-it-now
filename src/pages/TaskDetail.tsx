import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Circle, CheckCircle2, Zap, AlertTriangle, Footprints, History, Plus, Trash2, Edit3 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useTasks } from '../hooks/useTasks';
import { getEndOfDay, formatDisplayDate } from '../utils/dateUtils';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks, loading, completeTask, deleteTask, addTask, getSubtasks, refresh } = useTasks();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtaskDetails, setSubtaskDetails] = useState({
    importance: 'medium' as 'low' | 'medium' | 'high',
    resistance: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
    first_step: '',
  });
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const task = tasks.find(t => t.id === id);
  const subtasks = getSubtasks(id!);
  const today = new Date().toISOString().split('T')[0];

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    
    if (!subtaskDetails.due_date) {
      alert('子タスクの期限を入力してください。');
      return;
    }

    const dueDate = new Date(subtaskDetails.due_date);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    if (dueDate < startOfToday) {
      alert('過去の日付は設定できません。今日以降の日付を選択してください。');
      return;
    }

    try {
      await addTask({
        title: newSubtaskTitle,
        parent_id: id,
        importance: subtaskDetails.importance,
        resistance: subtaskDetails.resistance,
        current_due_date: getEndOfDay(subtaskDetails.due_date),
        first_step: subtaskDetails.first_step,
      });
      setNewSubtaskTitle('');
      setSubtaskDetails({
        importance: 'medium',
        resistance: 'medium',
        due_date: '',
        first_step: '',
      });
      refresh();
    } catch (err) {
      alert('子タスクの追加に失敗しました。');
    }
  };

  const handleCompleteRequest = (taskId: string) => {
    const pendingSubtasks = tasks.filter(t => t.parent_id === taskId && t.status !== 'completed');
    
    let message = "このタスクを完了にしてもよろしいですか？";
    if (pendingSubtasks.length > 0) {
      message = "未完了の子タスクが残っています。親タスクを完了にすると、すべての子タスクも完了になりますがよろしいですか？";
    }
    
    setConfirmMessage(message);
    setConfirmTaskId(taskId);
  };

  const confirmComplete = async () => {
    if (confirmTaskId) {
      if (isDeleting) {
        await deleteTask(confirmTaskId);
        navigate('/');
      } else {
        completeTask(confirmTaskId);
      }
      setConfirmTaskId(null);
      setIsDeleting(false);
    }
  };

  const handleDeleteRequest = () => {
    setConfirmMessage("このタスクを完全に削除します。よろしいですか？");
    setConfirmTaskId(id!);
    setIsDeleting(true);
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  if (!task) return <div className="p-8 text-center text-muted-foreground">タスクが見つかりません。</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-24">
      <ConfirmDialog 
        isOpen={!!confirmTaskId}
        title="完了の確認"
        message={confirmMessage}
        onConfirm={confirmComplete}
        onCancel={() => setConfirmTaskId(null)}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-secondary rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold truncate flex-1">{task.title}</h2>
        <div className="flex items-center gap-1 ml-auto">
          <button 
            onClick={() => navigate(`/task/${id}/edit`)}
            className="p-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          <button 
            onClick={handleDeleteRequest}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center gap-2">
          <Zap className={`w-6 h-6 ${
            task.resistance === 'high' ? 'text-resistance-high' : 
            task.resistance === 'medium' ? 'text-resistance-medium' : 'text-resistance-low'
          }`} />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">抵抗感</span>
          <span className="font-bold text-lg">
            {task.resistance === 'high' ? '重い' : task.resistance === 'medium' ? '普通' : '楽勝'}
          </span>
        </div>
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">重要度</span>
          <span className={`px-2 py-1 rounded text-xs font-bold border ${
            task.importance === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
            task.importance === 'medium' ? 'bg-secondary text-muted-foreground border-border' :
            'bg-secondary/50 text-muted-foreground/60 border-border/50'
          }`}>
            重要度：{task.importance === 'high' ? '高' : task.importance === 'medium' ? '中' : '低'}
          </span>
        </div>
      </div>

      {/* First Step */}
      <section className="bg-card p-8 rounded-3xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Footprints className="w-6 h-6 text-primary" />
          <h3 className="font-bold text-lg">最初の一歩</h3>
        </div>
        <p className={`text-muted-foreground leading-relaxed ${!task.first_step ? 'italic opacity-60' : ''}`}>
          {task.first_step || "（登録されていません）"}
        </p>
      </section>

      {/* Subtasks */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-lg text-foreground">タスクを小さく分ける</h3>
          <span className="text-[10px] bg-secondary px-2 py-1 rounded text-muted-foreground font-bold uppercase tracking-widest">{subtasks.length} subtasks</span>
        </div>

        <div className="space-y-4">
          {subtasks.map(st => (
            <div key={st.id} className="bg-card p-5 rounded-3xl border border-border shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow group">
              <button 
                onClick={() => handleCompleteRequest(st.id)}
                className="mt-1 text-muted-foreground hover:text-primary transition-colors active:scale-95"
              >
                {st.status === 'completed' ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <Circle className="w-6 h-6" />}
              </button>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <p className={`font-bold text-sm leading-tight ${st.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                    {st.title}
                  </p>
                  <button 
                    onClick={() => {
                      setConfirmMessage("この子タスクを削除しますか？");
                      setConfirmTaskId(st.id);
                      setIsDeleting(true);
                    }}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {st.status !== 'completed' && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] bg-secondary px-2 py-0.5 rounded font-bold uppercase text-muted-foreground">
                      {formatDisplayDate(st.current_due_date)}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
                      st.importance === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      st.importance === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {st.importance === 'high' ? 'HIGH' : st.importance === 'medium' ? 'MED' : 'LOW'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${
                      st.resistance === 'high' ? 'bg-resistance-high/10 text-resistance-high border-resistance-high/20' :
                      st.resistance === 'medium' ? 'bg-resistance-medium/10 text-resistance-medium border-resistance-medium/20' :
                      'bg-resistance-low/10 text-resistance-low border-resistance-low/20'
                    }`}>
                      ハードル：{st.resistance === 'high' ? '高' : st.resistance === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                )}
                {st.first_step && st.status !== 'completed' && (
                  <p className="text-[11px] text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-xl border border-border/50">
                    一歩目: {st.first_step}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* New Subtask Detailed Form (Always Visible) */}
          <form onSubmit={handleAddSubtask} className="bg-secondary/20 p-6 rounded-3xl border-2 border-dashed border-primary/20 space-y-5 mt-8 shadow-inner">
            <div className="flex flex-col gap-4">
              <input
                type="text"
                className="w-full bg-background border border-border p-4 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                placeholder="子タスクを追加する..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">重要度</label>
                  <select 
                    className="w-full bg-background border border-border p-3 rounded-xl text-xs font-bold outline-none shadow-sm cursor-pointer hover:bg-secondary/50 transition-colors"
                    value={subtaskDetails.importance}
                    onChange={e => setSubtaskDetails({...subtaskDetails, importance: e.target.value as any})}
                  >
                    <option value="high">高（HIGH）</option>
                    <option value="medium">中（MED）</option>
                    <option value="low">低（LOW）</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">抵抗感</label>
                  <select 
                    className="w-full bg-background border border-border p-3 rounded-xl text-xs font-bold outline-none shadow-sm cursor-pointer hover:bg-secondary/50 transition-colors"
                    value={subtaskDetails.resistance}
                    onChange={e => setSubtaskDetails({...subtaskDetails, resistance: e.target.value as any})}
                  >
                    <option value="high">重い（HARD）</option>
                    <option value="medium">普通（MED）</option>
                    <option value="low">楽勝（LOW）</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">期限（日付指定）</label>
                <input 
                  type="date"
                  className="w-full bg-background border border-border p-3 rounded-xl text-xs font-bold outline-none shadow-sm cursor-pointer hover:bg-secondary/50 transition-colors"
                  value={subtaskDetails.due_date}
                  min={today}
                  onChange={e => setSubtaskDetails({...subtaskDetails, due_date: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">最初の一歩</label>
                <textarea 
                  className="w-full bg-background border border-border p-3 rounded-xl text-xs font-bold min-h-[80px] outline-none shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="具体的に何をしますか？"
                  value={subtaskDetails.first_step}
                  onChange={e => setSubtaskDetails({...subtaskDetails, first_step: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!newSubtaskTitle.trim()}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              子タスクを確定する
            </button>
          </form>
        </div>
      </section>

      {/* History Placeholder */}
      <section className="pt-8 opacity-40">
        <div className="flex items-center gap-2 mb-3 text-muted-foreground">
          <History className="w-4 h-4" />
          <h3 className="font-bold text-sm">先延ばしの理由</h3>
        </div>
        <p className="text-xs italic text-muted-foreground px-1">履歴はまだありません</p>
      </section>
    </div>
  );
};

export default TaskDetail;
