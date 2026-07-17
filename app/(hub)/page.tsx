import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Hand,
  MessageCircle,
  Sparkles,
  UserRound
} from "lucide-react";
import { ConstellationLogo } from "@/components/ui/ConstellationLogo";
import { GlassCard } from "@/components/ui/GlassCard";
import { ParticleField } from "@/components/ui/ParticleField";
import { AmbientTarotBackdrop } from "@/components/hub/AmbientTarotBackdrop";
import { DailyDraw } from "@/components/hub/DailyDraw";
import { MouseStarTrail } from "@/components/hub/MouseStarTrail";

const entries = [
  {
    title: "普通解牌",
    description: "选择牌阵，回应一个具体问题",
    href: "/draw",
    icon: Sparkles
  },
  {
    title: "手势抽牌",
    description: "挥手之间，与牌对话",
    href: "/gesture-draw",
    icon: Hand,
    featured: true
  },
  {
    title: "牌库",
    description: "浏览完整78张塔罗图鉴",
    href: "/library",
    icon: BookOpen
  },
  {
    title: "聊天",
    description: "与大阿尔卡纳对话",
    href: "/chat",
    icon: MessageCircle
  }
];

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-bg-base">
      <Image
        src="/images/hub-starfield.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        aria-hidden="true"
      />
      <AmbientTarotBackdrop className="z-[2]" />
      <div className="image-vignette absolute inset-0 z-[3]" />
      <ParticleField className="z-[4] opacity-70" />
      <MouseStarTrail />

      <div className="relative z-10 grid min-h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] px-5 py-5 sm:px-8 lg:px-10">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <Link href="/" className="group flex items-center gap-3" aria-label="粒子首页">
            <ConstellationLogo className="transition duration-base group-hover:text-accent-gold-bright" />
            <span className="font-serif text-2xl font-medium tracking-[0.1em] text-text-primary">
              粒子
            </span>
          </Link>

          <nav className="flex items-center gap-3" aria-label="主导航">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-accent-gold px-5 py-2 text-sm font-medium text-text-primary transition-all duration-base hover:-translate-y-1 hover:border-accent-gold-bright hover:shadow-gold-glow active:translate-y-px"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              登录
            </Link>
          </nav>
        </header>

        <section
          className="mx-auto flex min-h-[360px] w-full max-w-7xl items-center justify-center px-1 py-6 md:min-h-[460px] md:px-8 md:py-8"
          aria-label="每日一签"
        >
          <div className="tarot-stage relative h-[48dvh] min-h-[360px] w-full max-w-5xl overflow-hidden rounded-lg md:h-[56dvh]">
            <DailyDraw />
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl pb-3">
          <nav
            className="grid grid-cols-2 gap-2 rounded-md border border-glass-border bg-bg-base-56 p-2 backdrop-blur-md md:grid-cols-4"
            aria-label="功能入口"
          >
            {entries.map((entry) => {
              const Icon = entry.icon;

              return (
                <Link key={entry.href} href={entry.href} className="group">
                  <GlassCard
                    interactive
                    className="relative flex min-h-[64px] items-center gap-3 overflow-hidden rounded-sm px-3 py-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-accent-gold-30 bg-bg-base-40 text-accent-gold transition duration-base group-hover:border-accent-gold-bright group-hover:text-accent-gold-bright">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-serif text-base font-semibold leading-none text-text-primary">
                        {entry.title}
                        {entry.featured ? (
                          <span className="hidden rounded-full border border-accent-gold-50 bg-accent-gold-10 px-1.5 py-0.5 font-sans text-[10px] font-medium text-accent-gold sm:inline-flex">
                            特色
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 hidden truncate text-xs text-text-secondary sm:block">
                        {entry.description}
                      </span>
                    </span>
                  </GlassCard>
                </Link>
              );
            })}
          </nav>

          <footer className="pt-3 text-center text-xs leading-5 text-text-secondary">
            塔罗视角仅供娱乐与自我探索参考，不构成医疗、法律、财务或心理专业建议
          </footer>
        </div>
      </div>
    </main>
  );
}
