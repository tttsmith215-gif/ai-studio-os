// ─── AI Studio OS: Template Engine Barrel Export ─────────────────

export type { CompositionTemplate, TemplateSlot, TemplateCategory } from "./types";
export { templateToComposition, slotToLayers, resolveAllTemplates, templateDurationFrames } from "./engine";
export {
  builtinTemplates,
  getTemplate,
  getTemplatesByCategory,
  getTemplateCategories,
  categoryLabels,
} from "./builtin";