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

  const type = process.argv[2] || 'overdue'; // 'morning', 'overdue', or 'test'

  if (type === 'test') {
    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    console.log(`Test mode: Found ${subs?.length || 0} subscriptions.`);
    for (const sub of (subs || [])) {
      await sendPush(sub, { title: 'Do It Now - Test', body: 'これは通知の疎通テストです。' }, supabase);
      console.log(`Sent test push to: ${sub.endpoint}`);
    }
    return;
  }

  if (type === 'morning') {
    // 毎朝のサマリー通知
    const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('*');
    if (subError) console.error('Error fetching subscriptions:', subError);
    console.log(`Debug: Found ${subs?.length || 0} subscriptions in DB.`);

    // 指定したDateをJSTのYYYYMMDD形式の数値で返す関数
    const getJstDateInt = (date) => {
      const parts = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month').value;
      const d = parts.find(p => p.type === 'day').value;
      return parseInt(y) * 10000 + parseInt(m) * 100 + parseInt(d);
    };

    const todayInt = getJstDateInt(new Date());
    console.log(`Debug: Current JST Date (Int): ${todayInt}`);

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

      console.log(`Debug: Tasks for user ${sub.user_id}: ${tasks.map(t => `${t.title}(${t.status})`).join(', ')}`);

      // 期限がJSTの「今日」か、すでに「超過」しているものを抽出
      const todayTasks = [];
      const overdueTasks = [];

      for (const t of tasks) {
        const dueDate = new Date(t.current_due_date);
        const dueInt = getJstDateInt(dueDate);
        
        const isToday = dueInt === todayInt;
        const isPast = dueInt < todayInt;

        console.log(`Debug: Task "${t.title}" (due: ${t.current_due_date}) -> DueInt: ${dueInt}, TodayInt: ${todayInt}, isToday: ${isToday}, isPast: ${isPast}`);

        if (isToday) todayTasks.push(t);
        else if (isPast) overdueTasks.push(t);
      }

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
