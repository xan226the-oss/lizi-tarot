export type GestureSoundCue = "awakening" | "shuffle" | "hover" | "grab" | "reveal";

export function playGestureSound(cue: GestureSoundCue) {
  // Phase A keeps sound as an integration seam. Phase B can map these cues to audio assets.
  void cue;
}
