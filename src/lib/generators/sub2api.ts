import { BaseImageGenerator, type GenerateResult, type ImageGenerateParams } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { normalizeToBase64ForGeneration } from '@/lib/media/outbound-image'
import { getXingtuoImageApiKey, getXingtuoImageBaseUrl } from '@/lib/xingtuo-image-config'

type ImageReference = {
  name: string
  mime_type: string
  kind: 'image'
  data_url: string
}

type SubmitResponse = {
  request_id?: unknown
  error?: unknown
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/${path.replace(/^\/+/, '')}`
}

function readDataUrlMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+);base64,/)
  return match?.[1] || 'image/png'
}

function normalizeImageSize(options: Record<string, unknown>): string {
  const explicitSize = typeof options.size === 'string' ? options.size.trim() : ''
  if (explicitSize) return explicitSize

  const aspectRatio = typeof options.aspectRatio === 'string' ? options.aspectRatio.trim() : ''
  if (aspectRatio === '2:3' || aspectRatio === '9:16' || aspectRatio === '3:4') return '1024x1536'
  if (aspectRatio === '3:2' || aspectRatio === '16:9' || aspectRatio === '4:3') return '1536x1024'
  return '1024x1024'
}

async function buildReferenceImages(referenceImages: string[]): Promise<ImageReference[]> {
  const dataUrls = await Promise.all(referenceImages.map((image) => normalizeToBase64ForGeneration(image)))
  return dataUrls.map((dataUrl, index) => ({
    name: `reference-${index + 1}.png`,
    mime_type: readDataUrlMimeType(dataUrl),
    kind: 'image',
    data_url: dataUrl,
  }))
}

export class Sub2ApiImageGenerator extends BaseImageGenerator {
  protected async doGenerate(params: ImageGenerateParams): Promise<GenerateResult> {
    const { userId, prompt, referenceImages = [], options = {} } = params
    const providerId = typeof options.provider === 'string' && options.provider.trim()
      ? options.provider.trim()
      : 'xingtuo'
    const providerConfig = await getProviderConfig(userId, providerId)
    const apiKey = getXingtuoImageApiKey(providerConfig.apiKey)
    const modelId = typeof options.modelId === 'string' && options.modelId.trim()
      ? options.modelId.trim()
      : 'gpt-image-2'
    const quality = typeof options.quality === 'string' && options.quality.trim()
      ? options.quality.trim()
      : 'high'

    const body: Record<string, unknown> = {
      model: modelId,
      prompt,
      size: normalizeImageSize(options),
      quality,
    }

    if (referenceImages.length > 0) {
      body.reference_images = await buildReferenceImages(referenceImages)
    }

    const maskImage = typeof options.maskImage === 'string' ? options.maskImage.trim() : ''
    if (maskImage) {
      body.mask_image = maskImage.startsWith('data:')
        ? maskImage
        : await normalizeToBase64ForGeneration(maskImage)
    }

    const response = await fetch(joinUrl(getXingtuoImageBaseUrl(providerConfig.baseUrl), '/xingtuo/image2/jobs'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const rawText = await response.text().catch(() => '')
    let payload: SubmitResponse = {}
    try {
      payload = rawText ? JSON.parse(rawText) as SubmitResponse : {}
    } catch {
      payload = {}
    }

    if (!response.ok) {
      const errorMessage = typeof payload.error === 'string' ? payload.error : rawText
      throw new Error(`SUB2API_IMAGE_SUBMIT_FAILED(${response.status}): ${errorMessage.slice(0, 300)}`)
    }

    const requestId = typeof payload.request_id === 'string' ? payload.request_id.trim() : ''
    if (!requestId) {
      throw new Error('SUB2API_IMAGE_REQUEST_ID_MISSING')
    }

    return {
      success: true,
      async: true,
      requestId,
      externalId: `XINGTUO:IMAGE:${requestId}`,
    }
  }
}
