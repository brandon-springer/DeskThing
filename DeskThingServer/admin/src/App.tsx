import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { adminWs } from './api/websocket'
import { adminFetch } from './api/client'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Apps from './pages/Apps'
import AppSettings from './pages/AppSettings'
import Downloads from './pages/Downloads'
import Clients from './pages/Clients'
import Mapping from './pages/Mapping'
import Developer from './pages/Developer'
import Settings from './pages/Settings'
import Device from './pages/Device'
import Setup from './pages/Setup'
import AdbConsole from './pages/AdbConsole'

function SetupGuard() {
  const [checked, setChecked] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    adminFetch<boolean>('/flags/flag_hasOpened')
      .then((val) => {
        setNeedsSetup(!val)
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [])

  if (!checked) return null
  if (needsSetup) return <Navigate to="/setup" replace />
  return <Outlet />
}

export default function App() {
  useEffect(() => {
    adminWs.connect()
    return () => adminWs.disconnect()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route element={<SetupGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/apps/:id/settings" element={<AppSettings />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/mapping" element={<Mapping />} />
            <Route path="/developer" element={<Developer />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/device" element={<Device />} />
            <Route path="/adb" element={<AdbConsole />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  )
}
