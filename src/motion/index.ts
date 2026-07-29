// ─── AI Studio OS: Motion Library ───────────────────────────────
// Reusable animated components for the Motion Studio.

export type { MotionConfig } from "./components";
export { AnimatedTitle, LowerThird, ShapeReveal, Typewriter, CountUp, CrossfadeTransition } from "./components";
export type { MotionComponent, MotionParam, LayerFactory, CompositionFactory } from "./registry";
export { builtinComponents, getComponent, getComponentsByCategory, getCategories } from "./registry";