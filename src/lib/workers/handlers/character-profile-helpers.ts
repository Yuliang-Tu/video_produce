import { prisma } from '@/lib/prisma'
import { safeParseJsonObject } from '@/lib/json-repair'
import { extractModelKey } from '@/lib/config-service'

export type AnyObj = Record<string, unknown>

export function readText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function readRequiredString(value: unknown, field: string): string {
  const text = readText(value).trim()
  if (!text) {
    throw new Error(`${field} is required`)
  }
  return text
}

export function parseVisualResponse(responseText: string): AnyObj {
  return safeParseJsonObject(responseText) as AnyObj
}

export async function resolveProjectModel(projectId: string, userId: string) {
  const [project, userPreference] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        novelPromotionData: {
          select: {
            id: true,
            analysisModel: true,
          },
        },
      },
    }),
    prisma.userPreference.findUnique({
      where: { userId },
      select: { analysisModel: true },
    }),
  ])

  if (!project) throw new Error('Project not found')
  if (!project.novelPromotionData) throw new Error('Novel promotion data not found')

  const analysisModel =
    extractModelKey(project.novelPromotionData.analysisModel) ||
    extractModelKey(userPreference?.analysisModel)
  if (!analysisModel) {
    throw new Error('请先在项目设置中配置分析模型')
  }

  return {
    ...project,
    novelPromotionData: {
      ...project.novelPromotionData,
      analysisModel,
    },
  }
}
