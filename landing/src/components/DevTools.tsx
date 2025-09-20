import React from 'react'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useUIStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useCacheStore } from '@/stores/cacheStore'
import { StorageHealth } from '@/components/StorageHealth'

interface DevToolsProps {
  isOpen: boolean
  onToggle: () => void
}

export const DevTools: React.FC<DevToolsProps> = ({ isOpen, onToggle }) => {
  const uiState = useUIStore()
  const settingsState = useSettingsStore()
  const cacheState = useCacheStore()

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Open DevTools"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            DevTools
          </h2>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Store States
                </h3>
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div className="font-medium">UI Store</div>
                    <div>Mobile Menu: {uiState.isMobileMenuOpen ? 'Open' : 'Closed'}</div>
                    <div>Language Dropdown: {uiState.isLanguageDropdownOpen ? 'Open' : 'Closed'}</div>
                    <div>Is Mobile: {uiState.isMobile ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div className="font-medium">Settings Store</div>
                    <div>Language: {settingsState.language}</div>
                    <div>Theme: {settingsState.theme}</div>
                    <div>Analytics: {settingsState.analyticsConsent === null ? 'Not asked' : settingsState.analyticsConsent ? 'Consented' : 'Declined'}</div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div className="font-medium">Cache Store</div>
                    <div>Image Cache: {Object.keys(cacheState.imageCache).length} items</div>
                    <div>API Cache: {Object.keys(cacheState.apiCache).length} items</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <StorageHealth />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full">
                <ReactQueryDevtools 
                  initialIsOpen={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
