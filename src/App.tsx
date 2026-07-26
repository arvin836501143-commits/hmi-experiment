import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Analysis from './pages/Analysis'
import Experiment from './pages/Experiment'

function App() {
  return (
    <Routes>
      {/* 实验流程页：独立全屏，不走 MainLayout */}
      <Route path="/experiment" element={<Experiment />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/analysis" replace />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="*" element={<Navigate to="/analysis" replace />} />
      </Route>
    </Routes>
  )
}

export default App
