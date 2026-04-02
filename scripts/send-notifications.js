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

  const typeArg = process.argv[2] || 'auto';
  const now = new Date();

  // 安全にJSTの日付・時刻を取得するヘルパー群
  const getJstDateIntSafe = (dateInput) => {
    try {
      if (!dateInput) return null;
      const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
      if (isNaN(date.getTime())) return null;
      const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
      return jstDate.getUTCFullYear() * 10000 + (jstDate.getUTCMonth() + 1) * 100 + jstDate.getUTCDate();
    } catch (e) { return null; }
  };

  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const jstHour = jstNow.getUTCHours();
  const todayInt = getJstDateIntSafe(now);

  console.log(`--- Notification Process Starting ---`);
  console.log(`Current Time (UTC): ${now.toISOString()}`);
  console.log(`Current Time (JST): ${jstNow.getUTCFullYear()}/${jstNow.getUTCMonth() + 1}/${jstNow.getUTCDate()} ${jstHour}:00 (approx)`);
  console.log(`Today's JST Date Int: ${todayInt}`);

  let type = typeArg;
  if (type === 'auto') {
    if (jstHour >= 5 && jstHour <= 11) type = 'morning'; // 朝6時前後〜昼前
    else if (jstHour >= 18 && jstHour <= 23) type = 'evening'; // 夜19時〜深夜
    else {
      console.log(`Warning: Current Hour (${jstHour}) is outside standard ranges. Defaulting to 'morning'.`);
      type = 'morning';
    }
  }
  console.log(`Detected Notification Type: ${type}`);

  // 全購読者の取得
  const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('*');
  if (subError) {
    console.error('Error fetching subscriptions:', subError);
    return;
  }
  console.log(`Total subscriptions found in DB: ${subs?.length || 0}`);

  if (type === 'morning') {
    // 毎朝のサマリー通知
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterInt = getJstDateIntSafe(threeDaysLater);

    for (const sub of (subs || [])) {
      console.log(`[Morning] Processing User: ${sub.user_id}`);
      const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', sub.user_id).neq('status', 'completed');
      if (!tasks || tasks.length === 0) continue;

      const todayTasks = [];
      const overdueTasks = [];
      const upcomingTasks = [];

      for (const t of tasks) {
        const dueInt = getJstDateIntSafe(t.current_due_date);
        if (dueInt === null) continue;
        
        if (dueInt === todayInt) todayTasks.push(t);
        else if (dueInt < todayInt) overdueTasks.push(t);
        else if (dueInt <= threeDaysLaterInt) upcomingTasks.push(t);
      }

      console.log(`- Results: Today=${todayTasks.length}, Overdue=${overdueTasks.length}, Upcoming=${upcomingTasks.length}`);

      if (todayTasks.length > 0 || overdueTasks.length > 0 || upcomingTasks.length > 0) {
        let body = `おはようございます！\n`;
        if (todayTasks.length > 0) body += `【今日が期限】\n${todayTasks.map(t => `・${t.title}`).join('\n')}\n`;
        if (overdueTasks.length > 0) body += `【期限超過中】\n${overdueTasks.map(t => `・${t.title}`).join('\n')}\n`;
        if (upcomingTasks.length > 0) body += `【近日中の予定】\n${upcomingTasks.map(t => `・${t.title}`).join('\n')}\n`;
        body += `\n今日も「最初の一歩」だけ進めてみませんか？`;
        
        await sendPush(sub, { title: 'Do It Now', body }, supabase);
      }
    }
  } else if (type === 'evening') {
    // 夜のリマインド通知
    for (const sub of (subs || [])) {
      console.log(`[Evening] Processing User: ${sub.user_id}`);
      const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', sub.user_id).neq('status', 'completed');
      if (!tasks) continue;

      const unfinishedTodayTasks = tasks.filter(t => getJstDateIntSafe(t.current_due_date) === todayInt);
      console.log(`- Results: Tasks due today=${unfinishedTodayTasks.length}`);

      if (unfinishedTodayTasks.length > 0) {
        let body = `今日が期限の未完了タスクがあります\n`;
        body += unfinishedTodayTasks.map(t => `・${t.title}`).join('\n');
        await sendPush(sub, { title: 'Do It Now', body }, supabase);
        console.log(`- Sent evening reminder.`);
      }
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
