import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: 'xingtuo',
    apiKey: 'xingtuo-key',
    baseUrl: 'https://xingtuo.test/v1/',
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

describe('async poll xingtuo image task', () => {
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

  it('returns completed image url when task succeeds', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        status: 'success',
        result: {
          data: [{ url: 'https://cdn.example/image.png' }],
        },
      }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('XINGTUO:IMAGE:img_req_123', 'user-1')

    expect(getProviderConfigMock).toHaveBeenCalledWith('user-1', 'xingtuo')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://xingtuo.test/v1/xingtuo/image2/jobs/img_req_123',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer xingtuo-key',
        },
        cache: 'no-store',
      },
    )
    expect(result).toEqual({
      status: 'completed',
      resultUrl: 'https://cdn.example/image.png',
      imageUrl: 'https://cdn.example/image.png',
    })
  })

  it('returns pending for non-terminal status', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'running' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await pollAsyncTask('XINGTUO:IMAGE:img_req_pending', 'user-1')

    expect(result).toEqual({ status: 'pending' })
  })

  it('uses dedicated image base url when provider base url is empty', async () => {
    getProviderConfigMock.mockResolvedValue({
      id: 'xingtuo',
      apiKey: 'xingtuo-key',
      baseUrl: '',
    })
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'running' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await pollAsyncTask('XINGTUO:IMAGE:img_req_default', 'user-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://121.127.253.220:8090/v1/xingtuo/image2/jobs/img_req_default',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('uses image-specific env config when provided', async () => {
    process.env.XINGTUO_IMAGE_BASE_URL = 'https://image-xingtuo.test/v1/'
    process.env.XINGTUO_IMAGE_API_KEY = 'image-key'
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'running' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await pollAsyncTask('XINGTUO:IMAGE:img_req_env', 'user-1')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://image-xingtuo.test/v1/xingtuo/image2/jobs/img_req_env',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer image-key',
        },
      }),
    )
  })

  it('keeps legacy SUB2API image external id compatible', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'running' }),
    }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await pollAsyncTask('SUB2API:IMAGE:img_legacy', 'user-1')

    expect(getProviderConfigMock).toHaveBeenCalledWith('user-1', 'xingtuo')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://xingtuo.test/v1/xingtuo/image2/jobs/img_legacy',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
