import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

async function sendNotifications() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  webpush.setVapidDetails(
    'mailto:example@example.com',
    vapidPublic,
    vapidPrivate
  );

  const type = process.argv[2] || 'overdue'; // 'morning' or 'overdue'

  if (type === 'morning') {
    // 毎朝のサマリー通知
    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    for (const sub of (subs || [])) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', sub.user_id)
        .neq('status', 'completed');

      if (!tasks || tasks.length === 0) continue;

      const now = new Date();
      const todayTasks = tasks.filter(t => new Date(t.current_due_date).toDateString() === now.toDateString());
      const overdueTasks = tasks.filter(t => new Date(t.current_due_date) < now);

      if (todayTasks.length === 0 && overdueTasks.length === 0) continue;

      let body = `おはようございます！本日の予定です\n`;
      if (todayTasks.length > 0) body += `・本日中: ${todayTasks.length}件\n`;
      if (overdueTasks.length > 0) body += `・期限超過: ${overdueTasks.length}件！\n`;
      body += `今日も無理のない範囲で進めていきましょう。`;

      await sendPush(sub, { title: 'Do It Now', body });
      console.log(`Sent morning summary to: ${sub.endpoint}`);
    }
  } else {
    // 期限超過時の単発通知
    const now = new Date();
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'todo')
      .eq('is_overdue_notified', false)
      .lt('current_due_date', now.toISOString());

    console.log(`Found ${overdueTasks?.length || 0} overdue tasks to notify.`);

    for (const task of (overdueTasks || [])) {
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', task.user_id);
      for (const sub of (subs || [])) {
        const body = `「${task.title}」の期限を過ぎています。予定通り進んでいますか？難しければ少し見直してみましょう。`;
        await sendPush(sub, { title: 'Do It Now', body, url: `/task/${task.id}` });
        console.log(`Sent overdue alert for task "${task.title}" to: ${sub.endpoint}`);
      }
      await supabase.from('tasks').update({ is_overdue_notified: true }).eq('id', task.id);
    }
  }
  console.log('Notification process completed.');
}

async function sendPush(sub, payload) {
  const subscription = {
    endpoint: sub.endpoint,
    keys: { auth: sub.auth_key, p256dh: sub.p256dh_key }
  };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('Push failed:', sub.endpoint);
  }
}

sendNotifications().catch(console.error);
