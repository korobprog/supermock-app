import { StateStorage } from 'zustand/middleware'

// Custom storage implementation with error handling
export const createCustomStorage = (name: string): StateStorage => ({
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null // Skip on server side
    
    try {
      const item = localStorage.getItem(key)
      if (item === null) return null
      
      // Check for invalid object string
      if (item === '[object Object]' || item === '[object Object]') {
        console.warn(`Invalid object string found for ${name}, clearing...`)
        localStorage.removeItem(key)
        return null
      }
      
      // Validate JSON
      JSON.parse(item)
      return item
    } catch (error) {
      console.warn(`Failed to parse stored data for ${name}:`, error)
      // Clear corrupted data
      localStorage.removeItem(key)
      return null
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return // Skip on server side
    
    try {
      // Ensure value is a string
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      localStorage.setItem(key, stringValue)
    } catch (error) {
      console.error(`Failed to store data for ${name}:`, error)
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        console.warn('Storage quota exceeded, clearing old data...')
        clearOldStorageData()
        try {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
          localStorage.setItem(key, stringValue)
        } catch (retryError) {
          console.error('Failed to store data after cleanup:', retryError)
        }
      }
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return // Skip on server side
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Failed to remove data for ${name}:`, error)
    }
  }
})

// Clear old storage data when quota is exceeded
const clearOldStorageData = (): void => {
  if (typeof window === 'undefined') return // Skip on server side
  
  const keysToKeep = [
    'landing-ui-store',
    'landing-settings-store',
    'landing-cache-store'
  ]
  
  const allKeys = Object.keys(localStorage)
  const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key))
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn(`Failed to remove key ${key}:`, error)
    }
  })
}

// Storage version management
export const STORAGE_VERSION = '1.0.0'

export const createVersionedStorage = (name: string): StateStorage => {
  const storage = createCustomStorage(name)
  
  return {
    getItem: (key: string): string | null => {
      const data = storage.getItem(key)
      if (!data) return null
      
      try {
        const parsed = JSON.parse(data)
        
        // Check version compatibility
        if (parsed.version && parsed.version !== STORAGE_VERSION) {
          console.warn(`Storage version mismatch for ${name}. Expected: ${STORAGE_VERSION}, Found: ${parsed.version}`)
          // Clear incompatible data
          storage.removeItem(key)
          return null
        }
        
        return data
      } catch (error) {
        console.warn(`Failed to parse versioned data for ${name}:`, error)
        storage.removeItem(key)
        return null
      }
    },
    
    setItem: (key: string, value: string): void => {
      try {
        // Check if value is already an object or a string
        let parsed;
        if (typeof value === 'string') {
          parsed = JSON.parse(value)
        } else {
          parsed = value
        }
        
        const versionedData = {
          ...parsed,
          version: STORAGE_VERSION,
          timestamp: Date.now()
        }
        storage.setItem(key, JSON.stringify(versionedData))
      } catch (error) {
        console.error(`Failed to set versioned data for ${name}:`, error)
        // Try to save as string if parsing fails
        try {
          storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
        } catch (fallbackError) {
          console.error(`Failed to save fallback data for ${name}:`, fallbackError)
        }
      }
    },
    
    removeItem: storage.removeItem
  }
}

// Migration utilities
export const migrateStorageData = (oldKey: string, newKey: string, transformer?: (data: any) => any): void => {
  if (typeof window === 'undefined') return // Skip on server side
  
  try {
    const oldData = localStorage.getItem(oldKey)
    if (oldData) {
      const parsed = JSON.parse(oldData)
      const transformed = transformer ? transformer(parsed) : parsed
      localStorage.setItem(newKey, JSON.stringify(transformed))
      localStorage.removeItem(oldKey)
      console.log(`Migrated data from ${oldKey} to ${newKey}`)
    }
  } catch (error) {
    console.error(`Failed to migrate data from ${oldKey} to ${newKey}:`, error)
  }
}

// Clean up corrupted localStorage data
export const cleanupCorruptedStorage = (): void => {
  if (typeof window === 'undefined') return // Skip on server side
  
  const keysToCheck = [
    'landing-ui-store',
    'landing-settings-store', 
    'landing-cache-store'
  ]
  
  keysToCheck.forEach(key => {
    try {
      const item = localStorage.getItem(key)
      if (item && (item === '[object Object]' || item === '[object Object]')) {
        console.warn(`Cleaning up corrupted data for key: ${key}`)
        localStorage.removeItem(key)
      }
      // Also check for invalid JSON
      if (item && item !== null) {
        try {
          JSON.parse(item)
        } catch (parseError) {
          console.warn(`Cleaning up invalid JSON for key: ${key}`)
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn(`Error checking key ${key}:`, error)
      localStorage.removeItem(key)
    }
  })
}

// Storage health check
export const checkStorageHealth = (): { healthy: boolean; issues: string[] } => {
  if (typeof window === 'undefined') return { healthy: true, issues: [] } // Skip on server side
  
  const issues: string[] = []
  
  try {
    // Test write/read
    const testKey = '__storage_test__'
    const testValue = JSON.stringify({ test: true, timestamp: Date.now() })
    
    localStorage.setItem(testKey, testValue)
    const retrieved = localStorage.getItem(testKey)
    localStorage.removeItem(testKey)
    
    if (retrieved !== testValue) {
      issues.push('Storage read/write test failed')
    }
  } catch (error) {
    issues.push(`Storage test failed: ${error}`)
  }
  
  // Check available space (rough estimate)
  try {
    let totalSize = 0
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        totalSize += localStorage[key].length + key.length
      }
    }
    
    // Warn if storage is getting full (5MB limit in most browsers)
    if (totalSize > 4 * 1024 * 1024) {
      issues.push('Storage is getting full (>4MB used)')
    }
  } catch (error) {
    issues.push(`Storage size check failed: ${error}`)
  }
  
  return {
    healthy: issues.length === 0,
    issues
  }
}
