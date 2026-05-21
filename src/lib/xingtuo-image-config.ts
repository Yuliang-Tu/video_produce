const DEFAULT_XINGTUO_IMAGE_BASE_URL = 'http://121.127.253.220:8090/v1'

export function getXingtuoImageBaseUrl(fallbackBaseUrl?: string): string {
  return (
    process.env.XINGTUO_IMAGE_BASE_URL?.trim()
    || process.env.SUB2API_IMAGE_BASE_URL?.trim()
    || fallbackBaseUrl?.trim()
    || DEFAULT_XINGTUO_IMAGE_BASE_URL
  ).replace(/\/+$/, '')
}

export function getXingtuoImageApiKey(fallbackApiKey: string): string {
  return process.env.XINGTUO_IMAGE_API_KEY?.trim()
    || process.env.SUB2API_IMAGE_API_KEY?.trim()
    || fallbackApiKey
}
