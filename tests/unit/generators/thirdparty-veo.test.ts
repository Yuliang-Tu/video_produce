import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() => vi.fn(async () => ({
  id: 'thirdparty-veo',
  apiKey: 'veo-key',
  baseUrl: 'https://veo.test/v1/',
})))

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
}))

import { ThirdpartyVeoVideoGenerator } from '@/lib/generators/thirdparty-veo'

describe('ThirdpartyVeoVideoGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProviderConfigMock.mockResolvedValue({
      id: 'thirdparty-veo',
      apiKey: 'veo-key',
      baseUrl: 'https://veo.test/v1/',
    })
  })

  it('submits 8s Veo jobs as JSON', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'task_json_1', status: 'queued' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const generator = new ThirdpartyVeoVideoGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/first.png',
      prompt: 'animate product',
      options: {
        modelId: 'veo_3_1-fast',
        aspectRatio: '16:9',
        resolution: '720p',
      },
    })

    expect(getProviderConfigMock).toHaveBeenCalledWith('user-1', 'thirdparty-veo')
    expect(fetchMock).toHaveBeenCalledWith('https://veo.test/v1/videos', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer veo-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'veo_3_1-fast',
        prompt: 'animate product',
        size: '1280x720',
        images: ['https://example.com/first.png'],
      }),
    })
    expect(result).toEqual({
      success: true,
      async: true,
      requestId: 'task_json_1',
      externalId: 'THIRDPARTY_VEO:VIDEO:task_json_1',
    })
  })

  it('submits 15s remix Veo jobs as multipart with prompt_extend', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ task_id: 'task_remix_1', status: 'SUBMITTED' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const generator = new ThirdpartyVeoVideoGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      imageUrl: 'https://example.com/first.png',
      prompt: 'first scene',
      options: {
        modelId: 'veo_3_1-fast-fl-remix',
        promptExtend: 'extended scene',
        aspectRatio: '9:16',
        resolution: '1080p',
        lastFrameImageUrl: 'https://example.com/last.png',
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://veo.test/v1/videos')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ Authorization: 'Bearer veo-key' })
    expect(init.body).toBeInstanceOf(FormData)
    const form = init.body as FormData
    expect(form.get('model')).toBe('veo_3_1-fast-fl-remix')
    expect(form.get('prompt')).toBe('first scene')
    expect(form.get('prompt_extend')).toBe('extended scene')
    expect(form.get('size')).toBe('1080x1920')
    expect(form.getAll('input_reference[]')).toEqual([
      'https://example.com/first.png',
      'https://example.com/last.png',
    ])
    expect(result.externalId).toBe('THIRDPARTY_VEO:VIDEO:task_remix_1')
  })
})
