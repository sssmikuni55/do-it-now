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
    const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('*');
    if (subError) console.error('Error fetching subscriptions:', subError);
    console.log(`Debug: Found ${subs?.length || 0} subscriptions in DB.`);

    // JSTの日付文字列(YYYY-MM-DD)を取得する関数
    const getJstDateString = (date) => {
      const formatter = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date).replace(/\//g, '-');
    };

    const jstDateString = getJstDateString(new Date());
    console.log(`Debug: Current JST Date string: ${jstDateString}`);

    for (const sub of (subs || [])) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', sub.user_id)
        .neq('status', 'completed');

      if (!tasks || tasks.length === 0) {
        console.log(`Debug: No pending tasks found for user: ${sub.user_id}`);
        continue;
      }

      // 期限がJSTの「今日」か、すでに「超過」しているものを抽出
      const todayTasks = tasks.filter(t => {
        const dueDate = new Date(t.current_due_date);
        const dueDateString = getJstDateString(dueDate);
        const isToday = dueDateString === jstDateString;
        console.log(`Debug: Task "${t.title}" (due: ${t.current_due_date}) -> JST: ${dueDateString}, isToday: ${isToday}`);
        return isToday;
      });

      const overdueTasks = tasks.filter(t => {
        const dueDate = new Date(t.current_due_date);
        const dueDateString = getJstDateString(dueDate);
        
        // 今日の文字列より小さければ明確に「過去（超過）」
        const isPast = dueDateString < jstDateString;
        return isPast;
      });

      console.log(`User ${sub.user_id}: Today=${todayTasks.length}, Overdue=${overdueTasks.length}`);

      if (todayTasks.length === 0 && overdueTasks.length === 0) continue;

      let body = `おはようございます！\n`;
      if (todayTasks.length > 0) {
        body += `【今日が期限】\n${todayTasks.map(t => `・${t.title}`).join('\n')}\n`;
      }
      if (overdueTasks.length > 0) {
        body += `【期限超過】\n${overdueTasks.map(t => `・${t.title}`).join('\n')}\n`;
      }
      body += `\n今日も今の「最初の一歩」だけ進めてみませんか？`;

      await sendPush(sub, { title: 'Do It Now', body }, supabase);
      console.log(`Sent morning summary to: ${sub.endpoint}`);
    }
  } else {
    // 全タスク数を確認（デバッグ用）
    const { count: allTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
    console.log(`Total tasks in DB: ${allTasksCount}`);

    // 期限超過時の単発通知
    const now = new Date();
    const { data: overdueTasks, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'todo')
      .lt('current_due_date', now.toISOString())
      .or('is_overdue_notified.eq.false,is_overdue_notified.is.null'); // null または false を対象

    if (taskError) console.error('Task fetch error:', taskError);
    console.log(`Found ${overdueTasks?.length || 0} overdue tasks to notify.`);

    for (const task of (overdueTasks || [])) {
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', task.user_id);
      for (const sub of (subs || [])) {
        const body = `「${task.title}」の期限を過ぎています。予定通り進んでいますか？難しければ少し見直してみましょう。`;
        await sendPush(sub, { title: 'Do It Now', body, url: `/task/${task.id}` }, supabase);
        console.log(`Sent overdue alert for task "${task.title}" to: ${sub.endpoint}`);
      }
      await supabase.from('tasks').update({ is_overdue_notified: true }).eq('id', task.id);
    }
  }
  console.log('Notification process completed.');
}

async function sendPush(sub, payload, supabase) {
  const subscription = {
    endpoint: sub.endpoint,
    keys: { auth: sub.auth_key, p256dh: sub.p256dh_key }
  };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error('Push failed:', sub.endpoint);
    console.error('Error status code:', err.statusCode);
    console.error('Error body:', err.body);
    
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('Subscription has expired or is no longer valid. Deleting from DB...');
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
  }
}

sendNotifications().catch(console.error);
