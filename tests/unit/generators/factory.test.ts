import { describe, expect, it } from 'vitest'
import { createAudioGenerator, createImageGenerator, createVideoGenerator } from '@/lib/generators/factory'
import { GoogleVeoVideoGenerator } from '@/lib/generators/video/google'
import { OpenAICompatibleVideoGenerator } from '@/lib/generators/video/openai-compatible'
import { BailianAudioGenerator, BailianImageGenerator, BailianVideoGenerator, SiliconFlowAudioGenerator } from '@/lib/generators/official'
import { Sub2ApiImageGenerator } from '@/lib/generators/sub2api'
import { ThirdpartyVeoVideoGenerator } from '@/lib/generators/thirdparty-veo'

describe('generator factory', () => {
  it('routes gemini-compatible video provider to Google video generator', () => {
    const generator = createVideoGenerator('gemini-compatible:gm-1')
    expect(generator).toBeInstanceOf(GoogleVeoVideoGenerator)
  })

  it('routes bailian official providers to official generators', () => {
    expect(createImageGenerator('bailian')).toBeInstanceOf(BailianImageGenerator)
    expect(createVideoGenerator('bailian')).toBeInstanceOf(BailianVideoGenerator)
    expect(createAudioGenerator('bailian')).toBeInstanceOf(BailianAudioGenerator)
  })

  it('routes siliconflow audio provider to official generator', () => {
    expect(createAudioGenerator('siliconflow')).toBeInstanceOf(SiliconFlowAudioGenerator)
  })

  it('routes sub2api image provider to dedicated generator', () => {
    expect(createImageGenerator('sub2api')).toBeInstanceOf(Sub2ApiImageGenerator)
  })

  it('routes xingtuo image provider to dedicated generator', () => {
    expect(createImageGenerator('xingtuo')).toBeInstanceOf(Sub2ApiImageGenerator)
  })

  it('routes thirdparty-veo video provider to dedicated generator', () => {
    expect(createVideoGenerator('thirdparty-veo')).toBeInstanceOf(ThirdpartyVeoVideoGenerator)
  })
})
