import type { ModelTier, PipelineStepName, PipelineSettings, ComplexityLevel } from './types'
import { DEFAULT_PIPELINE_SETTINGS } from './types'

// Maps ModelTier to Claude CLI model flag
const MODEL_FLAGS: Record<ModelTier, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
}

export function getModelFlag(tier: ModelTier): string {
  return MODEL_FLAGS[tier]
}

export function getModelForStep(
  stepName: PipelineStepName,
  settings?: PipelineSettings,
  complexity?: ComplexityLevel
): ModelTier {
  const models = settings?.models ?? DEFAULT_PIPELINE_SETTINGS.models

  // Plan step upgrades to opus for complex tasks
  if (stepName === 'plan' && complexity === 'complex') {
    return 'opus'
  }

  return models[stepName]
}

export function getModelFlagForStep(
  stepName: PipelineStepName,
  settings?: PipelineSettings,
  complexity?: ComplexityLevel
): string {
  const tier = getModelForStep(stepName, settings, complexity)
  return getModelFlag(tier)
}
