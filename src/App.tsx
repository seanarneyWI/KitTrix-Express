import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Execute from './pages/Execute'
import Analytics from './pages/Analytics'
import JobExecute from './pages/JobExecute'
import EditJob from './pages/EditJob'

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/execute" element={<Execute />} />
          <Route path="/execute/:jobId" element={<JobExecute />} />
          <Route path="/edit-job/:jobId" element={<EditJob />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  )
}

export default App