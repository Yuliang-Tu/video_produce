import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'thirdparty-veo',
    apiKey: 'veo-key',
    baseUrl: 'https://veo.test/v1/',
  })),
)

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
  getUserModels: vi.fn(),
}))

vi.mock('@/lib/async-submit', () => ({
  queryFalStatus: vi.fn(),
}))

vi.mock('@/lib/async-task-utils', () => ({
  queryGeminiBatchStatus: vi.fn(),
  queryGoogleVideoStatus: vi.fn(),
  querySeedanceVideoStatus: vi.fn(),
}))

import { pollAsyncTask } from '@/lib/async-poll'

describe('async poll thirdparty Veo task', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProviderConfigMock.mockResolvedValue({
      id: 'thirdparty-veo',
      apiKey: 'veo-key',
      baseUrl: 'https://veo.test/v1/',
    })
  })

  it('returns pending for NewAPI in-progress responses', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'IN_PROGRESS',
        data: { status: 'processing' },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('THIRDPARTY_VEO:VIDEO:task_1', 'user-1')

    expect(getProviderConfigMock).toHaveBeenCalledWith('user-1', 'thirdparty-veo')
    expect(fetchMock).toHaveBeenCalledWith('https://veo.test/v1/videos/task_1', {
      method: 'GET',
      headers: { Authorization: 'Bearer veo-key' },
      cache: 'no-store',
    })
    expect(result).toEqual({ status: 'pending' })
  })

  it('returns completed video url from nested NewAPI responses', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'SUCCESS',
        result_url: 'https://gateway.example/content',
        data: {
          status: 'completed',
          video_url: 'https://cdn.example/full.mp4',
        },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('THIRDPARTY_VEO:VIDEO:task_done', 'user-1')

    expect(result).toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.example/full.mp4',
      resultUrl: 'https://cdn.example/full.mp4',
    })
  })

  it('returns completed video url from top-level responses', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'completed',
        url: 'https://cdn.example/top.mp4',
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('THIRDPARTY_VEO:VIDEO:task_top', 'user-1')

    expect(result).toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.example/top.mp4',
      resultUrl: 'https://cdn.example/top.mp4',
    })
  })

  it('returns failed with provider error message', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'FAILURE',
        fail_reason: 'content rejected',
        data: { status: 'failed' },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('THIRDPARTY_VEO:VIDEO:task_fail', 'user-1')

    expect(result).toEqual({
      status: 'failed',
      error: 'content rejected',
    })
  })

  it('uses fallback video url when 15s remix extension fails after first segment succeeds', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'FAILURE',
        fail_reason: 'extension failed',
        data: {
          status: 'failed',
          video_url: 'https://cdn.example/first-8s.mp4',
          error: {
            code: 'extend_failed',
            message: 'extension failed',
          },
        },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('THIRDPARTY_VEO:VIDEO:task_extend_fail', 'user-1')

    expect(result).toEqual({
      status: 'completed',
      videoUrl: 'https://cdn.example/first-8s.mp4',
      resultUrl: 'https://cdn.example/first-8s.mp4',
    })
  })
})
