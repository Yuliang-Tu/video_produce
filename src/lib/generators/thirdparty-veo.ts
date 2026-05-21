import { BaseVideoGenerator, type GenerateResult, type VideoGenerateParams } from './base'
import { getProviderConfig } from '@/lib/api-config'

const PROVIDER_ID = 'thirdparty-veo'
const DEFAULT_SIZE_BY_RATIO: Record<string, string> = {
  '16:9': '1280x720',
  '9:16': '720x1280',
  '1:1': '720x720',
}
const DEFAULT_MODEL_BY_MODE: Record<string, string> = {
  normal: 'veo_3_1-fast',
  firstlastframe: 'veo_3_1-fast-fl',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeGenerationMode(value: unknown): 'normal' | 'firstlastframe' {
  return value === 'firstlastframe' ? 'firstlastframe' : 'normal'
}

function resolveSize(options: Record<string, unknown>): string | undefined {
  const explicitSize = readString(options.size)
  if (explicitSize) return explicitSize

  const resolution = readString(options.resolution)
  const aspectRatio = readString(options.aspectRatio) || readString(options.aspect_ratio)
  if (resolution === '1080p') {
    return aspectRatio === '9:16' ? '1080x1920' : '1920x1080'
  }
  if (resolution === '720p') {
    return aspectRatio === '9:16' ? '720x1280' : '1280x720'
  }
  return DEFAULT_SIZE_BY_RATIO[aspectRatio]
}

function isRemixModel(modelId: string): boolean {
  return modelId.endsWith('-remix')
}

function getTaskId(payload: unknown): string {
  if (!isRecord(payload)) return ''
  const direct = readString(payload.id) || readString(payload.task_id)
  if (direct) return direct
  if (isRecord(payload.data)) {
    return readString(payload.data.id) || readString(payload.data.task_id)
  }
  return ''
}

function getErrorMessage(payload: unknown, status: number): string {
  if (isRecord(payload)) {
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim()
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim()
    if (isRecord(payload.error) && typeof payload.error.message === 'string' && payload.error.message.trim()) {
      return payload.error.message.trim()
    }
  }
  return `THIRDPARTY_VEO_SUBMIT_FAILED(${status})`
}

export class ThirdpartyVeoVideoGenerator extends BaseVideoGenerator {
  protected async doGenerate(params: VideoGenerateParams): Promise<GenerateResult> {
    const { userId, imageUrl, prompt = '', options = {} } = params
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      throw new Error('THIRDPARTY_VEO_PROMPT_REQUIRED')
    }

    const providerConfig = await getProviderConfig(userId, PROVIDER_ID)
    if (!providerConfig.baseUrl) {
      throw new Error(`PROVIDER_BASE_URL_MISSING: ${providerConfig.id}`)
    }

    const mode = normalizeGenerationMode(options.generationMode)
    const modelId = readString(options.modelId) || DEFAULT_MODEL_BY_MODE[mode]
    const lastFrameImageUrl = readString(options.lastFrameImageUrl)
    const images = [readString(imageUrl), lastFrameImageUrl].filter(Boolean)
    const size = resolveSize(options)
    const baseUrl = providerConfig.baseUrl.replace(/\/+$/, '')
    const response = isRemixModel(modelId)
      ? await this.submitMultipart({
        baseUrl,
        apiKey: providerConfig.apiKey,
        modelId,
        prompt: trimmedPrompt,
        promptExtend: readString(options.promptExtend) || readString(options.prompt_extend) || trimmedPrompt,
        size,
        images,
      })
      : await this.submitJson({
        baseUrl,
        apiKey: providerConfig.apiKey,
        body: {
          model: modelId,
          prompt: trimmedPrompt,
          ...(size ? { size } : {}),
          ...(images.length > 0 ? { images } : {}),
        },
      })
    const rawText = await response.text().catch(() => '')
    let payload: unknown = rawText
    try {
      payload = rawText ? JSON.parse(rawText) : null
    } catch {
      payload = rawText
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, response.status))
    }

    const taskId = getTaskId(payload)
    if (!taskId) {
      throw new Error('THIRDPARTY_VEO_TASK_ID_MISSING')
    }

    return {
      success: true,
      async: true,
      requestId: taskId,
      externalId: `THIRDPARTY_VEO:VIDEO:${taskId}`,
    }
  }

  private async submitJson(params: {
    baseUrl: string
    apiKey: string
    body: Record<string, unknown>
  }): Promise<Response> {
    return fetch(`${params.baseUrl}/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.body),
    })
  }

  private async submitMultipart(params: {
    baseUrl: string
    apiKey: string
    modelId: string
    prompt: string
    promptExtend: string
    size?: string
    images: string[]
  }): Promise<Response> {
    const body = new FormData()
    body.append('model', params.modelId)
    body.append('prompt', params.prompt)
    body.append('prompt_extend', params.promptExtend)
    if (params.size) body.append('size', params.size)
    for (const image of params.images) {
      body.append('input_reference[]', image)
    }

    return fetch(`${params.baseUrl}/videos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
      body,
    })
  }
}
