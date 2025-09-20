import React, { useState, useEffect } from 'react'
import { checkStorageHealth } from '@/lib/persistence'

interface StorageHealthProps {
  className?: string
}

export const StorageHealth: React.FC<StorageHealthProps> = ({ className = '' }) => {
  const [health, setHealth] = useState<{ healthy: boolean; issues: string[] } | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkHealth = async () => {
    setIsChecking(true)
    try {
      const result = checkStorageHealth()
      setHealth(result)
    } catch (error) {
      setHealth({
        healthy: false,
        issues: [`Health check failed: ${error}`]
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  if (!health) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        Checking storage health...
      </div>
    )
  }

  return (
    <div className={`text-xs ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            health.healthy ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className={health.healthy ? 'text-green-600' : 'text-red-600'}>
          Storage {health.healthy ? 'Healthy' : 'Issues Found'}
        </span>
        <button
          onClick={checkHealth}
          disabled={isChecking}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      {health.issues.length > 0 && (
        <div className="text-red-600">
          <div className="font-medium">Issues:</div>
          <ul className="list-disc list-inside ml-2">
            {health.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
