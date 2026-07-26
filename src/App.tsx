import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Experiments from './pages/Experiments'
import Surveys from './pages/Surveys'
import Analysis from './pages/Analysis'
import Experiment from './pages/Experiment'

function App() {
  return (
    <Routes>
      {/* 实验流程页：独立全屏，不走 MainLayout */}
      <Route path="/experiment" element={<Experiment />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="experiments" element={<Experiments />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
