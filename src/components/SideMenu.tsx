import { Menu } from 'antd'
import {
  DashboardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import type { MenuProps } from 'antd'

type MenuItem = Required<MenuProps>['items'][number]

const items: MenuItem[] = [
  { key: '/', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/experiment', icon: <PlayCircleOutlined />, label: '开始实验' },
  { key: '/experiments', icon: <ExperimentOutlined />, label: '实验管理' },
  { key: '/surveys', icon: <FileTextOutlined />, label: '调研问卷' },
  { key: '/analysis', icon: <BarChartOutlined />, label: '数据分析' },
]

function SideMenu() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={items}
      onClick={({ key }) => navigate(key)}
    />
  )
}

export default SideMenu
