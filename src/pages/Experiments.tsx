import { Card, Table, Tag, Typography, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

interface ExperimentRecord {
  key: string
  name: string
  type: string
  status: 'running' | 'done' | 'planning'
  participants: number
  updatedAt: string
}

const statusMap: Record<ExperimentRecord['status'], { text: string; color: string }> = {
  running: { text: '进行中', color: 'processing' },
  done: { text: '已完成', color: 'success' },
  planning: { text: '规划中', color: 'default' },
}

const data: ExperimentRecord[] = [
  { key: '1', name: '示例实验 A', type: '行为实验', status: 'running', participants: 32, updatedAt: '2026-07-20' },
  { key: '2', name: '示例实验 B', type: '问卷调研', status: 'planning', participants: 0, updatedAt: '2026-07-22' },
  { key: '3', name: '示例实验 C', type: '眼动实验', status: 'done', participants: 24, updatedAt: '2026-07-15' },
]

function Experiments() {
  const columns: ColumnsType<ExperimentRecord> = [
    { title: '实验名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (s: ExperimentRecord['status']) => (
        <Tag color={statusMap[s].color}>{statusMap[s].text}</Tag>
      ),
    },
    { title: '被试数', dataIndex: 'participants' },
    { title: '更新时间', dataIndex: 'updatedAt' },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        实验管理
      </Title>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />}>
            新建实验
          </Button>
        </Space>
        <Table columns={columns} dataSource={data} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  )
}

export default Experiments
