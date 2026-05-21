import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() => vi.fn(async () => ({
  id: 'xingtuo',
  apiKey: 'xingtuo-key',
  baseUrl: 'https://xingtuo.test/v1/',
})))

const normalizeToBase64ForGenerationMock = vi.hoisted(() =>
  vi.fn(async (value: string) => {
    if (value === 'ref-jpeg') return 'data:image/jpeg;base64,UkVG'
    if (value === 'mask-url') return 'data:image/png;base64,TUFTSw=='
    return value
  }),
)

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
}))

vi.mock('@/lib/media/outbound-image', () => ({
  normalizeToBase64ForGeneration: normalizeToBase64ForGenerationMock,
}))

import { Sub2ApiImageGenerator } from '@/lib/generators/sub2api'

describe('Sub2ApiImageGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.XINGTUO_IMAGE_BASE_URL
    delete process.env.XINGTUO_IMAGE_API_KEY
    delete process.env.SUB2API_IMAGE_BASE_URL
    delete process.env.SUB2API_IMAGE_API_KEY
    getProviderConfigMock.mockResolvedValue({
      id: 'xingtuo',
      apiKey: 'xingtuo-key',
      baseUrl: 'https://xingtuo.test/v1/',
    })
  })

  it('submits image job with dedicated Xingtuo payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ request_id: 'img_req_123' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const generator = new Sub2ApiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'draw product shot',
      referenceImages: ['ref-jpeg'],
      options: {
        modelId: 'gpt-image-2',
        aspectRatio: '16:9',
        quality: 'medium',
        maskImage: 'mask-url',
      },
    })

    expect(result).toEqual({
      success: true,
      async: true,
      requestId: 'img_req_123',
      externalId: 'XINGTUO:IMAGE:img_req_123',
    })
    expect(getProviderConfigMock).toHaveBeenCalledWith('user-1', 'xingtuo')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://xingtuo.test/v1/xingtuo/image2/jobs', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer xingtuo-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt: 'draw product shot',
        size: '1536x1024',
        quality: 'medium',
        reference_images: [{
          name: 'reference-1.png',
          mime_type: 'image/jpeg',
          kind: 'image',
          data_url: 'data:image/jpeg;base64,UkVG',
        }],
        mask_image: 'data:image/png;base64,TUFTSw==',
      }),
      cache: 'no-store',
    })
  })

  it('uses dedicated image base url and default options', async () => {
    getProviderConfigMock.mockResolvedValue({
      id: 'xingtuo',
      apiKey: 'xingtuo-key',
      baseUrl: '',
    })
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ request_id: 'img_default' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const generator = new Sub2ApiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'draw square icon',
    })

    expect(result.externalId).toBe('XINGTUO:IMAGE:img_default')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://121.127.253.220:8090/v1/xingtuo/image2/jobs',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt: 'draw square icon',
          size: '1024x1024',
          quality: 'high',
        }),
      }),
    )
  })

  it('uses image-specific env config when provided', async () => {
    process.env.XINGTUO_IMAGE_BASE_URL = 'https://image-xingtuo.test/v1/'
    process.env.XINGTUO_IMAGE_API_KEY = 'image-key'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ request_id: 'img_env' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const generator = new Sub2ApiImageGenerator()
    await generator.generate({
      userId: 'user-1',
      prompt: 'draw env image',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://image-xingtuo.test/v1/xingtuo/image2/jobs',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer image-key',
          'Content-Type': 'application/json',
        },
      }),
    )
  })
})
