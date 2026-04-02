import { createClient } from '@supabase/supabase-js';

const url = 'https://calqrfzutkzteyipalxr.supabase.co';
const key = 'sb_publishable_xupXT0j_mD0bJV1GCbX4Rw_JzqWLveL';
const supabase = createClient(url, key);

async function investigate() {
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  const { data: tasks } = await supabase.from('tasks').select('*').neq('status', 'completed');

  console.log('--- Investigation ---');
  console.log('Total Push Subscriptions:', subs?.length);
  console.log('Total Pending Tasks (All Users):', tasks?.length);

  if (tasks && subs) {
    tasks.forEach(t => {
      const match = subs.find(s => s.user_id === t.user_id);
      console.log(`Task: [${t.title}]`);
      console.log(`  User: ${t.user_id}`);
      console.log(`  Subscription Found: ${match ? 'YES' : 'NO'}`);
      console.log(`  Due Date (raw): ${t.current_due_date}`);
      
      const getJstDateIntSafe = (dateInput) => {
        if (!dateInput) return null;
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return null;
        const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        return jstDate.getUTCFullYear() * 10000 + (jstDate.getUTCMonth() + 1) * 100 + jstDate.getUTCDate();
      };
      
      const dueInt = getJstDateIntSafe(t.current_due_date);
      const now = new Date();
      // Simulate evening notification time (JST 21:00 today)
      const simulatedNowAt21Jst = new Date();
      simulatedNowAt21Jst.setUTCHours(12, 0, 0, 0); // April 2 12:00 UTC = April 2 21:00 JST
      
      const todayInt = getJstDateIntSafe(simulatedNowAt21Jst);
      
      console.log(`  JST Due Int: ${dueInt}`);
      console.log(`  JST Today Int (at 21:00): ${todayInt}`);
      console.log(`  Notification should send: ${dueInt === todayInt && !!match ? 'YES' : 'NO'}`);
      console.log('---');
    });
  }
}

investigate().catch(console.error);
