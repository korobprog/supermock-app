const PROTOCOL_REGEX = /^(?:[a-z][a-z0-9+\-.]*:|\/\/)/i

const normalizeBasePath = (value?: string | null): string => {
  if (!value || value === '/') {
    return ''
  }

  const trimmed = value.trim()

  if (!trimmed || trimmed === '/') {
    return ''
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  const withLeadingSlash = withoutTrailingSlash.startsWith('/')
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`

  return withLeadingSlash === '/' ? '' : withLeadingSlash
}

const envBasePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

export const getBasePath = (): string => {
  if (typeof window !== 'undefined') {
    const runtimeBasePath = normalizeBasePath(
      (window as typeof window & { __NEXT_DATA__?: { basePath?: string } })
        .__NEXT_DATA__?.basePath ??
        (window as typeof window & { __NEXT_BASE_PATH__?: string })
          .__NEXT_BASE_PATH__
    )

    if (runtimeBasePath) {
      return runtimeBasePath
    }
  }

  return envBasePath
}

const isExternal = (path: string): boolean => PROTOCOL_REGEX.test(path) || path.startsWith('#')

export const withBasePath = (path: string): string => {
  if (!path) {
    const basePath = getBasePath()
    return basePath || '/'
  }

  if (isExternal(path)) {
    return path
  }

  const basePath = getBasePath()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!basePath) {
    return normalizedPath
  }

  if (
    normalizedPath === basePath ||
    normalizedPath.startsWith(`${basePath}/`)
  ) {
    return normalizedPath
  }

  if (normalizedPath === '/' || normalizedPath === '') {
    return basePath
  }

  return `${basePath}${normalizedPath}`
}

export const ensureBasePathTrailingSlash = (path: string): string => {
  const basePath = withBasePath(path)

  if (isExternal(basePath)) {
    return basePath
  }

  return basePath.endsWith('/') ? basePath : `${basePath}/`
}
