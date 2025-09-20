import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n.ts' // Инициализация интернационализации
import { cleanupCorruptedStorage } from './lib/persistence'

// Clean up corrupted localStorage data on app start
cleanupCorruptedStorage()

// Force clear problematic localStorage keys if they exist
if (typeof window !== 'undefined') {
  try {
    const problematicKeys = ['landing-ui-store', 'landing-settings-store', 'landing-cache-store']
    problematicKeys.forEach(key => {
      const item = localStorage.getItem(key)
      if (item && (item === '[object Object]' || item === '[object Object]')) {
        console.warn(`Force clearing problematic key: ${key}`)
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Error during localStorage cleanup:', error)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
