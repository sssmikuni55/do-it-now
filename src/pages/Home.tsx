import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../hooks/useTasks';
import { ExcuseModal } from '../components/ExcuseModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

const Home = () => {
  const navigate = useNavigate();
  const { tasks, loading, completeTask, refresh } = useTasks();
  const [overdueTask, setOverdueTask] = useState<Task | null>(null);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string>('');

  useEffect(() => {
    // Check for overdue tasks (including subtasks)
    if (!loading && tasks.length > 0) {
      const now = new Date();
      const overdue = tasks.find(t => 
        t.status !== 'completed' && 
        new Date(t.current_due_date) < now
      );
      if (overdue) {
        setOverdueTask(overdue);
      }
    }
  }, [tasks, loading]);

  const todoTasks = tasks.filter(t => t.status !== 'completed' && !t.parent_id);
  const lowResistanceTasks = tasks.filter(t => t.status !== 'completed' && t.resistance === 'low');
  const otherTasks = todoTasks.filter(t => t.resistance !== 'low');

  const handleCompleteRequest = (taskId: string) => {
    const pendingSubtasks = tasks.filter(t => t.parent_id === taskId && t.status !== 'completed');
    
    let message = "このタスクを完了してよろしいですか？";
    if (pendingSubtasks.length > 0) {
      message = "未完了の子タスクが残っています。親タスクを完了にすると、すべての子タスクも完了になりますがよろしいですか？";
    }
    
    setConfirmMessage(message);
    setConfirmTaskId(taskId);
  };

  const confirmComplete = () => {
    if (confirmTaskId) {
      completeTask(confirmTaskId);
      setConfirmTaskId(null);
    }
  };

  const TaskCard = ({ task, isSubtask = false }: { task: Task, isSubtask?: boolean }) => {
    const subtasks = tasks.filter(st => st.parent_id === task.id && st.status !== 'completed');

    return (
      <div className={`space-y-2 ${isSubtask ? 'ml-6 border-l-2 border-primary/10 pl-4' : ''}`}>
        <div 
          onClick={() => navigate(`/task/${task.id}`)}
          className={`bg-card p-4 rounded-xl border border-border shadow-sm flex items-start gap-4 active:bg-secondary transition-all group cursor-pointer ${isSubtask ? 'py-3' : ''}`}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleCompleteRequest(task.id);
            }}
            className="mt-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <Circle className="w-6 h-6 group-hover:hidden" />
            <CheckCircle2 className="w-6 h-6 hidden group-hover:block" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-semibold ${isSubtask ? 'text-xs' : 'text-sm'}`}>{task.title}</p>
              {task.importance === 'high' && <AlertCircle className="w-3 h-3 text-destructive" />}
            </div>
            
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(task.current_due_date).toLocaleDateString()}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                task.resistance === 'high' ? 'bg-resistance-high/10 text-resistance-high' :
                task.resistance === 'medium' ? 'bg-resistance-medium/10 text-resistance-medium' :
                'bg-resistance-low/10 text-resistance-low'
              }`}>
                {task.resistance === 'low' ? '2MIN' : task.resistance === 'medium' ? 'MED' : 'HARD'}
              </span>
            </div>
          </div>
        </div>

        {/* Nested Subtasks on Home Screen */}
        {!isSubtask && subtasks.length > 0 && (
          <div className="space-y-2 mt-2">
            {subtasks.map(st => (
              <TaskCard key={st.id} task={st} isSubtask={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <ConfirmDialog 
        isOpen={!!confirmTaskId}
        title="完了の確認"
        message={confirmMessage}
        onConfirm={confirmComplete}
        onCancel={() => setConfirmTaskId(null)}
      />
      {/* Overdue Modal */}
      {overdueTask && (
        <ExcuseModal 
          task={overdueTask} 
          onClose={() => setOverdueTask(null)} 
          onSuccess={() => {
            setOverdueTask(null);
            refresh();
          }} 
        />
      )}

      {/* Hero / Welcome */}
      <section className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/20">
        <h2 className="text-sm font-medium opacity-80 mb-1">こんにちは</h2>
        <p className="text-2xl font-bold whitespace-pre-line">
          {todoTasks.length > 0 
            ? `${todoTasks.length}件のタスクを\n完了させましょう`
            : "すべてのタスクが\n完了しました！"}
        </p>
      </section>

      {/* 2-Minute Rules (Show individual actionable items) */}
      {lowResistanceTasks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-resistance-low rounded-full animate-pulse" />
              すぐにとりかかれるタスク
            </h3>
            <span className="text-[10px] bg-secondary px-2 py-1 rounded text-muted-foreground font-bold">2 MIN RULE</span>
          </div>
          <div className="space-y-3">
            {lowResistanceTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* Other Tasks (Grouped by Parent) */}
      <section>
        <h3 className="font-bold mb-4 px-1">タスク一覧</h3>
        {otherTasks.length > 0 ? (
          <div className="space-y-6">
            {otherTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <p className="text-center py-10 text-muted-foreground text-sm italic">
            {todoTasks.length === 0 ? "完璧な状態です！" : "残りは重いタスクだけのようです。細分化しましょう。"}
          </p>
        )}
      </section>
    </div>
  );
};

export default Home;
