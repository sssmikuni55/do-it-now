import { createClient } from '@supabase/supabase-js';

const url = 'https://calqrfzutkzteyipalxr.supabase.co';
const key = 'sb_publishable_xupXT0j_mD0bJV1GCbX4Rw_JzqWLveL';

const supabase = createClient(url, key);

async function check() {
  const { data: tasks } = await supabase.from('tasks').select('*');
  console.log('Total tasks:', tasks?.length);
  
  if (tasks) {
    const incomplete = tasks.filter(t => t.status !== 'completed');
    console.log('Incomplete tasks:', incomplete.length);
    incomplete.forEach(t => {
      console.log(`- ${t.title} | Due: ${t.current_due_date}`);
      
      const getJstDateIntSafe = (dateInput) => {
        if (!dateInput) return null;
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return null;
        const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        return jstDate.getUTCFullYear() * 10000 + (jstDate.getUTCMonth() + 1) * 100 + jstDate.getUTCDate();
      };
      
      const dueInt = getJstDateIntSafe(t.current_due_date);
      const todayInt = getJstDateIntSafe(new Date());
      console.log(`  -> dueInt: ${dueInt}, todayInt: ${todayInt}`);
    });
  }
}

check().catch(console.error);
