import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export interface Task {
  id: string;
  title: string;
  importance: 'high' | 'medium' | 'low';
  resistance: 'high' | 'medium' | 'low';
  first_step: string;
  original_due_date: string;
  current_due_date: string;
  status: 'todo' | 'in_progress' | 'completed';
  parent_id: string | null;
  created_at: string;
  is_first_step_completed: boolean;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const getSubtasks = (parentId: string) => {
    return tasks.filter(t => t.parent_id === parentId);
  };

  const completeTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', id);
    
    if (error) console.error('Error completing task:', error);
    else fetchTasks();
  };

  const addTask = async (taskData: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('tasks').insert([
      { ...taskData, user_id: user.id }
    ]);
    if (error) throw error;
    fetchTasks();
  };

  const updateTask = async (id: string, updates: any) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    fetchTasks();
  };

  const toggleFirstStepStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_first_step_completed: !currentStatus })
      .eq('id', id);
    
    if (error) throw error;
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    // 関連する excuse_logs も削除されるように（カスケード設定がない場合を考慮）
    await supabase.from('excuse_logs').delete().eq('task_id', id);
    // 子タスクの削除
    await supabase.from('tasks').delete().eq('parent_id', id);
    // タスク本体の削除
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    
    if (error) console.error('Error deleting task:', error);
    else fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return { tasks, loading, completeTask, deleteTask, updateTask, toggleFirstStepStatus, addTask, getSubtasks, refresh: fetchTasks };
};
