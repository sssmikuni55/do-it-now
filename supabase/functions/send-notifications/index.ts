import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as webpush from "https://esm.sh/web-push"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-auth, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const publicVapidKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const privateVapidKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    webpush.setVapidDetails(
      'mailto:example@example.com',
      publicVapidKey,
      privateVapidKey
    )

    const { type } = await req.json() // 'morning' or 'overdue'

    if (type === 'morning') {
      // 毎朝の定期通知ロジック
      const { data: users } = await supabase.from('push_subscriptions').select('user_id, endpoint, auth_key, p256dh_key')
      
      for (const sub of (users || [])) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', sub.user_id)
          .neq('status', 'completed')

        if (!tasks || tasks.length === 0) continue

        const now = new Date()
        const todayTasks = tasks.filter(t => new Date(t.current_due_date).toDateString() === now.toDateString())
        const overdueTasks = tasks.filter(t => new Date(t.current_due_date) < now)

        if (todayTasks.length === 0 && overdueTasks.length === 0) continue

        let body = `おはようございます！本日の予定です\n`
        if (todayTasks.length > 0) body += `・本日中: ${todayTasks.length}件\n`
        if (overdueTasks.length > 0) body += `・期限超過: ${overdueTasks.length}件！\n`
        body += `今日も無理のない範囲で進めていきましょう。`

        await sendPush(sub, { title: 'Do It Now', body })
      }
    } else {
      // 期限超過時の単発通知ロジック
      const now = new Date()
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('*, push_subscriptions(*)')
        .eq('status', 'todo')
        .eq('is_overdue_notified', false)
        .lt('current_due_date', now.toISOString())

      for (const task of (overdueTasks || [])) {
        const subs = await supabase.from('push_subscriptions').select('*').eq('user_id', task.user_id)
        
        for (const sub of (subs.data || [])) {
          const body = `「${task.title}」の期限を過ぎています。予定通り進んでいますか？難しければ少し見直してみましょう。`
          await sendPush(sub, { title: 'Do It Now', body, url: `/task/${task.id}` })
        }

        // 通知済みフラグを立てる
        await supabase.from('tasks').update({ is_overdue_notified: true }).eq('id', task.id)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function sendPush(sub: any, payload: any) {
  const subscription = {
    endpoint: sub.endpoint,
    keys: {
      auth: sub.auth_key,
      p256dh: sub.p256dh_key
    }
  }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
  } catch (err) {
    console.error('Push send failed:', err)
  }
}
