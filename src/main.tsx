import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'antd/dist/reset.css'
import App from './App'
import './index.css'

dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 12,
        },
        components: {
          Layout: {
            siderBg: '#000000',
            headerBg: '#000000',
            bodyBg: '#141414',
          },
          Menu: {
            darkItemBg: '#000000',
            darkSubMenuItemBg: '#000000',
            darkItemSelectedBg: 'rgba(255, 255, 255, 0.08)',
            darkItemColor: 'rgba(255, 255, 255, 0.65)',
            darkItemHoverColor: 'rgba(255, 255, 255, 0.85)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
            darkItemSelectedColor: '#ffffff',
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
)
