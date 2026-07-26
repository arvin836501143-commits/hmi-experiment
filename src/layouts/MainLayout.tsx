import { useState } from 'react'
import { Layout, Avatar, Typography, Space } from 'antd'
import { UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Outlet, useLocation } from 'react-router-dom'
import SideMenu from '../components/SideMenu'

const { Header, Sider, Content } = Layout

const titleMap: Record<string, string> = {
  '/experiment': '开始实验',
  '/analysis': '数据分析',
}

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: '#000',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0' : '0 24px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 600,
            fontSize: collapsed ? 20 : 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {collapsed ? 'H' : 'HMI Experiment'}
        </div>
        <SideMenu />
      </Sider>
      <Layout style={{ height: '100%', overflow: 'hidden' }}>
        <Header
          style={{
            flex: '0 0 56px',
            padding: '0 24px',
            background: '#000',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <span
              style={{ cursor: 'pointer', fontSize: 18, color: 'rgba(255, 255, 255, 0.85)' }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {titleMap[location.pathname] ?? 'HMI Experiment'}
            </Typography.Title>
          </Space>
          <Space>
            <Avatar icon={<UserOutlined />} />
            <Typography.Text>研究者</Typography.Text>
          </Space>
        </Header>
        <Content
          style={{
            flex: 1,
            minHeight: 0,
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
