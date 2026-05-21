import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
  userPreference: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { getProjectModelConfig } from '@/lib/config-service'

describe('config-service project model fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to user default media models when project fields are empty', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      analysisModel: null,
      characterModel: null,
      locationModel: '',
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
      videoRatio: null,
      artStyle: null,
      capabilityOverrides: null,
    })
    prismaMock.userPreference.findUnique.mockResolvedValue({
      analysisModel: 'sub2api::gpt-5.5',
      characterModel: 'xingtuo::gpt-image-2',
      locationModel: 'xingtuo::gpt-image-2',
      storyboardModel: 'xingtuo::gpt-image-2',
      editModel: 'xingtuo::gpt-image-2',
      videoModel: 'vidu::vidu-video',
      audioModel: 'bailian::cosyvoice',
      capabilityDefaults: null,
    })

    const config = await getProjectModelConfig('project-1', 'user-1')

    expect(config).toMatchObject({
      analysisModel: 'sub2api::gpt-5.5',
      characterModel: 'xingtuo::gpt-image-2',
      locationModel: 'xingtuo::gpt-image-2',
      storyboardModel: 'xingtuo::gpt-image-2',
      editModel: 'xingtuo::gpt-image-2',
      videoModel: 'vidu::vidu-video',
      audioModel: 'bailian::cosyvoice',
    })
  })

  it('prefers project media models over user defaults', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValue({
      analysisModel: 'sub2api::project-llm',
      characterModel: 'sub2api::project-image',
      locationModel: 'sub2api::project-location',
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
      videoRatio: null,
      artStyle: null,
      capabilityOverrides: null,
    })
    prismaMock.userPreference.findUnique.mockResolvedValue({
      analysisModel: 'sub2api::user-llm',
      characterModel: 'sub2api::user-image',
      locationModel: 'sub2api::user-location',
      capabilityDefaults: null,
    })

    const config = await getProjectModelConfig('project-1', 'user-1')

    expect(config.analysisModel).toBe('sub2api::project-llm')
    expect(config.characterModel).toBe('sub2api::project-image')
    expect(config.locationModel).toBe('sub2api::project-location')
  })
})
