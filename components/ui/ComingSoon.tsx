import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ParticleField } from "@/components/ui/ParticleField";

type ComingSoonProps = {
  title: string;
};

export function ComingSoon({ title }: ComingSoonProps) {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-bg-base bg-starfield-radial px-6 py-10">
      <ParticleField className="opacity-80" />
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] max-w-3xl items-center justify-center">
        <GlassCard className="w-full p-8 text-center">
          <p className="font-cinzel text-sm uppercase tracking-[0.24em] text-accent-gold">
            Phase 0
          </p>
          <h1 className="mt-4 font-serif text-3xl text-text-primary md:text-4xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-text-secondary">
            开发中。当前阶段先完成项目脚手架、设计系统和首页 Hub 静态界面。
          </p>
          <Link href="/" className="mt-8 inline-flex">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回首页
            </Button>
          </Link>
        </GlassCard>
      </div>
    </main>
  );
}
