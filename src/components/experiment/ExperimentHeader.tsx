import { Steps, Typography } from 'antd'
import {
  SolutionOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  FormOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'

const { Text } = Typography

/** 实验流程步骤描述（4 步） */
const EXPERIMENT_STEPS = [
  { title: '信息采集', icon: <SolutionOutlined /> },
  { title: '图形测验', icon: <EyeOutlined /> },
  { title: '接管测试', icon: <ThunderboltOutlined /> },
  { title: '主观调研', icon: <FormOutlined /> },
]

interface ExperimentHeaderProps {
  /** 当前步骤索引 (0-3) */
  currentStep: number
}

/** 顶部栏高度（px），供外部计算内容区域留白 */
export const HEADER_HEIGHT = 72

/**
 * 实验固定顶部通栏
 *
 * - 圆角容器，距离屏幕顶部/左右各有相等间距
 * - 中间为 Steps 实验进度（固定宽度，左右留白）
 * - 右侧为实验平台标识
 * - 在所有流程阶段常驻显示
 */
function ExperimentHeader({ currentStep }: ExperimentHeaderProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '12px 16px',
      }}
    >
      <div
        style={{
          background: '#1f1f1f',
          borderRadius: 12,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* 左侧：占位留白，与右侧标识保持视觉平衡 */}
        <div style={{ flex: '0 0 auto', width: 80 }} />

        {/* 中间：实验进度 Steps（固定宽度，居中） */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ width: '100%', maxWidth: 800 }}>
            <Steps
              current={currentStep}
              items={EXPERIMENT_STEPS}
              size="small"
              responsive={false}
            />
          </div>
        </div>

        {/* 右侧：实验平台标识 */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: 0.5,
            width: 80,
            justifyContent: 'flex-end',
          }}
        >
          <ExperimentOutlined style={{ fontSize: 14 }} />
          <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            HMI 实验
          </Text>
        </div>
      </div>
    </div>
  )
}

export default ExperimentHeader
