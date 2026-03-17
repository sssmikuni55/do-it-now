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

    // 安全にJSTの日付数値を取得する関数（ロケールやサーバー設定に依存しない絶対オフセット方式）
    const getJstDateIntSafe = (dateInput) => {
      try {
        if (!dateInput) return null;
        const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return null;

        // UTC時間に 9時間（JST）を加算して直接日付を取り出す
        const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        const y = jstDate.getUTCFullYear();
        const m = jstDate.getUTCMonth() + 1;
        const d = jstDate.getUTCDate();
        return y * 10000 + m * 100 + d;
      } catch (e) {
        console.error(`Error parsing date: ${dateInput}`, e);
        return null;
      }
    };

    const todayInt = getJstDateIntSafe(new Date());
    // 3日後の日付数値を取得
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterInt = getJstDateIntSafe(threeDaysLater);

    console.log(`Debug: Current JST Date: ${todayInt}, 3 Days Later: ${threeDaysLaterInt}`);

    for (const sub of (subs || [])) {
      console.log(`Analysis for User: ${sub.user_id}`);
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', sub.user_id)
        .neq('status', 'completed');

      if (!tasks || tasks.length === 0) {
        console.log(`Debug: No pending tasks found in DB for user_id: ${sub.user_id}`);
        continue;
      }

      console.log(`Debug: Total pending tasks in DB: ${tasks.length}`);

      const todayTasks = [];
      const overdueTasks = [];
      const upcomingTasks = [];

      for (const t of tasks) {
        const dueInt = getJstDateIntSafe(t.current_due_date);
        if (dueInt === null) {
          console.log(`Debug: Skipping task "${t.title}" due to invalid date: ${t.current_due_date}`);
          continue;
        }
        
        if (dueInt === todayInt) {
          todayTasks.push(t);
        } else if (dueInt < todayInt) {
          overdueTasks.push(t);
        } else if (dueInt <= threeDaysLaterInt) {
          upcomingTasks.push(t);
        }
      }

      console.log(`User ${sub.user_id}: Final Filter Results -> Today=${todayTasks.length}, Overdue=${overdueTasks.length}, Upcoming=${upcomingTasks.length}`);

      if (todayTasks.length === 0 && overdueTasks.length === 0 && upcomingTasks.length === 0) {
        console.log(`Debug: No tasks matched for today/overdue/upcoming. Skipping notification.`);
        continue;
      }

      let body = `おはようございます！\n`;
      if (todayTasks.length > 0) {
        body += `【今日が期限】\n${todayTasks.map(t => `・${t.title}`).join('\n')}\n`;
      }
      if (overdueTasks.length > 0) {
        body += `【期限超過中】\n${overdueTasks.map(t => `・${t.title}`).join('\n')}\n`;
      }
      if (upcomingTasks.length > 0) {
        body += `【近日中の予定】\n${upcomingTasks.map(t => `・${t.title}`).join('\n')}\n`;
      }
      body += `\n今日も今の「最初の一歩」だけ進めてみませんか？`;

      await sendPush(sub, { title: 'Do It Now', body }, supabase);
      console.log(`Sent morning summary notification.`);
    }
  } else {
    // 全タスク数を確認（デバッグ用）
    const { count: allTasksCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
    console.log(`Total tasks in DB: ${allTasksCount}`);

    // 期限超過時の単発通知
    const now = new Date();
    const { data: overdueTasks, error: taskError } = await supabase
    // 期限超過通知（毎時実行される想定）
    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    
    // 安全にJSTの日付数値を取得する関数（共通化のため内部定義）
    const getJstDateIntSafe = (dateInput) => {
      try {
        if (!dateInput) return null;
        const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
        if (isNaN(date.getTime())) return null;
        const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        return jstDate.getUTCFullYear() * 10000 + (jstDate.getUTCMonth() + 1) * 100 + jstDate.getUTCDate();
      } catch (e) { return null; }
    };

    const todayInt = getJstDateIntSafe(new Date());

    for (const sub of (subs || [])) {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', sub.user_id).neq('status', 'completed');
      const overdueTasks = (tasks || []).filter(t => {
        const dueInt = getJstDateIntSafe(t.current_due_date);
        return dueInt !== null && dueInt < todayInt;
      });

      if (overdueTasks.length > 0) {
        await sendPush(sub, { title: 'Do It Now - 期限超過', body: `${overdueTasks.length}件のタスクが期限を過ぎています。確認してみましょう。` }, supabase);
        console.log(`Sent overdue alert for user ${sub.user_id} with ${overdueTasks.length} tasks.`);
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
