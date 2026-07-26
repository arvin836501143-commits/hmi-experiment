import { useState } from 'react'
import { Layout, Avatar, Typography, Space, theme } from 'antd'
import { UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Outlet, useLocation } from 'react-router-dom'
import SideMenu from '../components/SideMenu'

const { Header, Sider, Content } = Layout

const titleMap: Record<string, string> = {
  '/': '工作台概览',
  '/experiments': '实验管理',
  '/surveys': '调研问卷',
  '/analysis': '数据分析',
}

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { token } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220}>
        <div
          style={{
            height: 56,
            margin: 8,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: token.colorPrimary,
            fontWeight: 600,
            fontSize: collapsed ? 20 : 16,
          }}
        >
          {collapsed ? '实' : '实验平台'}
        </div>
        <SideMenu />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <span
              style={{ cursor: 'pointer', fontSize: 18, color: token.colorText }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {titleMap[location.pathname] ?? '实验平台'}
            </Typography.Title>
          </Space>
          <Space>
            <Avatar icon={<UserOutlined />} />
            <Typography.Text>研究者</Typography.Text>
          </Space>
        </Header>
        <Content
          style={{
            margin: 0,
            padding: '24px 16px',
            background: '#141414',
            display: 'flex',
            justifyContent: 'center',
            overflow: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: 1200 }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
