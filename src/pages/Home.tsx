import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, Footprints, ChevronRight, Lightbulb } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../hooks/useTasks';
import { ExcuseModal } from '../components/ExcuseModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { isOverdue, getDiffDays, formatDisplayDate } from '../utils/dateUtils';

const SwipeStep = ({ task, onComplete }: { task: Task, onComplete: () => void }) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(task.is_first_step_completed);

  // Sync with external state changes
  useEffect(() => {
    setIsSwiped(task.is_first_step_completed);
  }, [task.is_first_step_completed]);

  const handleStart = (clientX: number) => {
    if (isSwiped) return;
    setStartX(clientX);
  };

  const handleMove = (clientX: number, containerWidth: number) => {
    if (startX === null || isSwiped) return;
    const diff = clientX - startX;
    const max = containerWidth - 44; 
    const progress = Math.min(Math.max(0, diff), max);
    setCurrentX(progress);
    
    if (progress >= max * 0.95) {
      setIsSwiped(true);
      setStartX(null);
      setCurrentX(0);
      onComplete();
    }
  };

  const handleEnd = () => {
    if (isSwiped) return;
    setStartX(null);
    setCurrentX(0);
  };

  const handleUndo = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isSwiped) {
      onComplete(); // toggle back
    }
  };

  return (
    <div 
      className={`relative h-11 rounded-xl overflow-hidden mb-2 border transition-all ${
        isSwiped 
          ? 'bg-green-500/10 border-green-500/20' 
          : 'bg-secondary/30 border-border/50'
      }`}
      onMouseMove={(e) => handleMove(e.clientX, e.currentTarget.offsetWidth)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.currentTarget.offsetWidth)}
      onTouchEnd={handleEnd}
    >
      {/* Background Text (Guide) - Hidden when swiping or completed */}
      {!isSwiped && currentX === 0 && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
          <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/30">
            <span>スライドして完了</span>
            <ChevronRight className="w-3 h-3 animate-pulse" />
          </div>
        </div>
      )}

      {/* Track / Content */}
      <div className="absolute inset-0 flex items-center px-2">
        <p className={`text-[11px] leading-tight flex-1 ml-10 transition-opacity ${
          isSwiped ? 'line-through text-green-700/60' : 'text-muted-foreground font-medium'
        }`}>
          {task.first_step}
        </p>
      </div>

      {/* Handle */}
      <div
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onClick={handleUndo}
        style={{ transform: `translateX(${currentX}px)` }}
        className={`absolute left-1 top-1 w-9 h-9 rounded-lg flex items-center justify-center transition-all shadow-sm ${
          isSwiped 
            ? 'bg-green-500 text-white cursor-pointer hover:scale-105 active:scale-95' 
            : 'bg-background text-muted-foreground border border-border/50 cursor-grab active:cursor-grabbing'
        }`}
      >
        <Footprints className="w-4 h-4" />
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { tasks, loading, completeTask, toggleFirstStepStatus, refresh } = useTasks();
  const [overdueTask, setOverdueTask] = useState<Task | null>(null);
  const [confirmTaskId, setConfirmTaskId] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string>('');

  useEffect(() => {
    // Check for overdue tasks (including subtasks)
    if (!loading && tasks.length > 0) {
      const overdue = tasks.find(t => 
        t.status !== 'completed' && 
        isOverdue(t.current_due_date)
      );
      if (overdue) {
        setOverdueTask(overdue);
      }
    }
  }, [tasks, loading]);

  const todoTasks = tasks.filter(t => t.status !== 'completed' && !t.parent_id);
  
  // 「すぐにとりかかれるタスク」の条件を修正
  // 抵抗感が 'low' かつ (期限が未設定 または 今日まで または 明日まで または 超過)
  const lowResistanceTasks = tasks
    .filter(t => {
      if (t.status === 'completed') return false;
      if (t.resistance !== 'low') return false;
      
      // 期限のチェック
      if (!t.current_due_date) return true; // 期限なしは常に表示
      
      const diffDays = getDiffDays(t.current_due_date);
      // 期限が明日（1日後）までなら表示（今日・明日・超過を含む）
      return diffDays <= 1;
    })
    .sort((a, b) => {
      if (!a.current_due_date) return 1;
      if (!b.current_due_date) return -1;
      return new Date(a.current_due_date).getTime() - new Date(b.current_due_date).getTime();
    });
  
  const otherTasks = todoTasks
    .filter(t => !lowResistanceTasks.find(lt => lt.id === t.id))
    .sort((a, b) => {
      if (!a.current_due_date) return 1;
      if (!b.current_due_date) return -1;
      return new Date(a.current_due_date).getTime() - new Date(b.current_due_date).getTime();
    });

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
          className={`bg-card p-4 rounded-xl border-2 transition-all group cursor-pointer ${
            (() => {
              const now = new Date();
              now.setHours(0,0,0,0);
              const dueDate = new Date(task.current_due_date);
              dueDate.setHours(0,0,0,0);
              const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 0) return 'border-destructive bg-destructive/5 shadow-lg shadow-destructive/10';
              if (diffDays <= 2) return 'border-amber-400 shadow-md shadow-amber-400/20 ring-1 ring-amber-400/50';
              return 'border-border shadow-sm';
            })()
          } flex items-start gap-4 active:bg-secondary ${isSubtask ? 'py-3' : ''}`}
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-bold truncate ${isSubtask ? 'text-xs' : 'text-sm'}`}>{task.title}</p>
              {task.importance === 'high' && (
                <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20 whitespace-nowrap">
                  重要度：高
                </span>
              )}
            </div>
            
            {!isSubtask && task.first_step && (
              <SwipeStep 
                task={task} 
                onComplete={() => toggleFirstStepStatus(task.id, task.is_first_step_completed)} 
              />
            )}
            
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium">
              <span className={`flex items-center gap-1 ${
                (() => {
                  const diffDays = getDiffDays(task.current_due_date);
                  return diffDays <= 1 ? 'text-destructive font-bold' : '';
                })()
              }`}>
                <Clock className="w-3 h-3" />
                {(() => {
                  const diffDays = getDiffDays(task.current_due_date);
                  const displayDate = `期限 ${formatDisplayDate(task.current_due_date)}`;
                  
                  if (diffDays < 0) return `${displayDate} 経過`;
                  if (diffDays === 0) return `${displayDate} 締切(今日)`;
                  return `${displayDate}(あと${diffDays}日)`;
                })()}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border whitespace-nowrap ${
                task.resistance === 'high' ? 'bg-resistance-high/10 text-resistance-high border-resistance-high/20' :
                task.resistance === 'medium' ? 'bg-resistance-medium/10 text-resistance-medium border-resistance-medium/20' :
                'bg-resistance-low/10 text-resistance-low border-resistance-low/20'
              }`}>
                ハードル：{task.resistance === 'low' ? '低' : task.resistance === 'medium' ? '中' : '高'}
              </span>
              {(() => {
                // 半分経過の判定（1週間以上のタスクのみ）
                const start = new Date(task.created_at).getTime();
                const end = new Date(task.current_due_date).getTime();
                const now = new Date().getTime();
                const duration = end - start;
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                
                if (duration >= sevenDays && (now - start) > (duration / 2) && now < end) {
                  return (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                      折り返し
                    </span>
                  );
                }
                return null;
              })()}
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
      <section className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-sm font-medium opacity-80 mb-1">こんにちは</h2>
          <p className="text-2xl font-bold whitespace-pre-line mb-4">
            {todoTasks.length > 0 
              ? `${todoTasks.length}件のタスクを\n完了させましょう`
              : "すべてのタスクが\n完了しました！"}
          </p>
          <button 
            onClick={() => navigate('/guide')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-[11px] font-bold backdrop-blur-sm transition-all"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            使い方を見る
          </button>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
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
