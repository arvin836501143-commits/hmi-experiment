import { Card, Col, Row, Statistic, Typography, Button, Space } from 'antd'
import {
  ExperimentOutlined,
  FileTextOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

function Dashboard() {
  const navigate = useNavigate()

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        工作台概览
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="进行中实验" value={5} prefix={<ExperimentOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="调研问卷" value={12} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="参与被试" value={128} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成实验"
              value={8}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#52c41a' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* 开始实验入口 */}
      <Card style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph style={{ margin: 0 }}>
            智能座舱 HMI 线上交互实验 — 基于认知风格差异的驾驶绩效与用户偏好研究。
            点击下方按钮开始完整实验流程（信息采集 → 镶嵌图形测验 → 视频观看）。
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate('/experiment')}
          >
            开始实验
          </Button>
        </Space>
      </Card>

      <Card title="平台说明" style={{ marginTop: 16 }}>
        <Paragraph>
          本平台用于封装论文中的调研与实验流程。当前已实现前三个流程：被试招募与信息采集、数字化镶嵌图形测验、道路行驶视频观看。后续流程将持续开发。
        </Paragraph>
      </Card>
    </div>
  )
}

export default Dashboard
