import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASK_TYPE, type TaskJobData } from '@/lib/task/types'

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(async () => ({ id: 'project-1', name: 'Project One' })),
  },
  novelPromotionStoryboard: {
    findUnique: vi.fn(async () => ({
      id: 'storyboard-1',
      clip: {
        id: 'clip-1',
        content: 'clip content',
        characters: null,
        location: null,
        props: null,
        screenplay: null,
      },
      episode: { id: 'episode-1' },
    })),
    update: vi.fn(async () => ({})),
  },
  novelPromotionProject: {
    findUnique: vi.fn(async () => ({
      id: 'novel-project-1',
      analysisModel: null,
      characters: [],
      locations: [],
    })),
  },
  userPreference: {
    findUnique: vi.fn(async () => ({ analysisModel: 'xingtuo::gpt-5.5' })),
  },
  novelPromotionPanel: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async () => ({})),
  },
  $transaction: vi.fn(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => await fn(prismaMock)),
}))

const progressMock = vi.hoisted(() => ({
  reportTaskProgress: vi.fn(async () => undefined),
  reportTaskStreamChunk: vi.fn(async () => undefined),
  withTaskLifecycle: vi.fn(),
}))

const storyboardPhaseMock = vi.hoisted(() => ({
  executePhase1: vi.fn(async () => ({ planPanels: [{ panel_number: 1 }] })),
  executePhase2: vi.fn(async () => ({ photographyRules: [] })),
  executePhase2Acting: vi.fn(async () => ({ actingDirections: [] })),
  executePhase3: vi.fn(async () => ({
    finalPanels: [{
      panel_number: 1,
      shot_type: 'medium',
      camera_move: 'static',
      description: 'A generated panel',
      location: 'Room',
      characters: [],
      props: [],
      srt_range: [0, 1],
      duration: 1,
      video_prompt: 'A generated panel',
      source_text: 'clip content',
    }],
  })),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/redis', () => ({ queueRedis: {} }))
vi.mock('bullmq', () => ({
  Queue: class {
    constructor() {}
  },
  Worker: class {},
}))
vi.mock('@/lib/workers/shared', () => progressMock)
vi.mock('@/lib/workers/utils', () => ({
  assertTaskActive: vi.fn(async () => undefined),
}))
vi.mock('@/lib/llm-observe/internal-stream-context', () => ({
  withInternalLLMStreamCallbacks: vi.fn(async (_callbacks: unknown, fn: () => Promise<unknown>) => await fn()),
}))
vi.mock('@/lib/storyboard-phases', () => storyboardPhaseMock)

function buildJob(): Job<TaskJobData> {
  return {
    data: {
      taskId: 'task-1',
      type: TASK_TYPE.REGENERATE_STORYBOARD_TEXT,
      locale: 'zh',
      projectId: 'project-1',
      episodeId: 'episode-1',
      targetType: 'NovelPromotionStoryboard',
      targetId: 'storyboard-1',
      payload: { storyboardId: 'storyboard-1' },
      userId: 'user-1',
      trace: null,
    },
    queueName: 'text',
  } as unknown as Job<TaskJobData>
}

describe('regenerate storyboard text worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to user analysis model when project analysis model is missing', async () => {
    const { handleRegenerateStoryboardTextTask } = await import('@/lib/workers/text.worker')

    const result = await handleRegenerateStoryboardTextTask(buildJob())

    expect(prismaMock.userPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { analysisModel: true },
    })
    expect(storyboardPhaseMock.executePhase1).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        analysisModel: 'xingtuo::gpt-5.5',
      }),
      expect.anything(),
      'project-1',
      'Project One',
      'zh',
    )
    expect(result).toEqual({
      storyboardId: 'storyboard-1',
      panelCount: 1,
    })
  })
})
