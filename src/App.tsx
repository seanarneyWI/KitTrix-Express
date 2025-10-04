import React from 'react'
import { Routes, Route } from 'react-router-dom'
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