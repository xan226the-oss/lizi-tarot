import { Suspense } from "react";
import { NormalDrawExperience } from "@/components/draw/NormalDrawExperience";

export default function DrawPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#020309]" />}>
      <NormalDrawExperience />
    </Suspense>
  );
}
