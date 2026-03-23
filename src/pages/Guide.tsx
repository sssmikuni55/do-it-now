import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Footprints, 
  Zap, 
  MessageSquare, 
  AlertTriangle, 
  ChevronRight,
  Lightbulb,
  Rocket
} from 'lucide-react';

const GuideStep = ({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  color: string 
}) => (
  <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-sm`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="font-bold text-lg">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
      {description}
    </p>
  </div>
);

const Guide = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-secondary rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold">使い方ガイド</h2>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 p-8 rounded-[2rem] text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
        <div className="relative z-10">
          <Rocket className="w-12 h-12 mb-4 opacity-90" />
          <h1 className="text-3xl font-bold mb-3">「あとで」を「いま」に変える魔法</h1>
          <p className="opacity-90 leading-relaxed font-medium">
            Do It Now は、脳の「着手抵抗」を最小限にして、
            スッと作業に入れるように設計されたアプリです。
          </p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      </section>

      {/* Steps */}
      <div className="grid gap-6">
        <GuideStep 
          icon={Footprints}
          color="bg-green-500"
          title="1. 驚くほど小さく分ける"
          description={`「レポートを書く」は重すぎます。\n「タイトルだけ入力する」「PCの前に座る」など、5分以内に終わる『最初の一歩』を決めましょう。`}
        />

        <GuideStep 
          icon={Zap}
          color="bg-amber-500"
          title="2. スライドして着手開始"
          description={`ホーム画面の「最初の一歩」をスライドすると着手完了です。これだけで脳は「作業モード」に切り替わりやすくなります。`}
        />

        <GuideStep 
          icon={MessageSquare}
          color="bg-blue-500"
          title="3. 「言い訳」を記録する"
          description={`どうしても着手できない時は「言い訳」を残しましょう。自分の弱さを知ることで、次回どう対策すればいいかが見えてきます。`}
        />

        <GuideStep 
          icon={AlertTriangle}
          color="bg-destructive"
          title="4. 感情を数値化する"
          description={`タスクを「重要度」と「抵抗感（やりたくない気持ち）」の2軸で評価します。抵抗感が高いものは、もっと細かく分解するサインです。`}
        />
      </div>

      {/* Philosophy Callout */}
      <section className="bg-secondary/50 p-6 rounded-3xl border border-border/50 flex gap-4 items-start">
        <Lightbulb className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div className="space-y-2">
          <h4 className="font-bold text-sm">Do It Now の哲学</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            完璧主義を捨てて「不完全な一歩」を愛しましょう。
            一度動き出せば、やる気は後からついてきます。
          </p>
        </div>
      </section>

      {/* Final Action */}
      <div className="pt-4">
        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          さっそくタスクを作る
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Guide;
