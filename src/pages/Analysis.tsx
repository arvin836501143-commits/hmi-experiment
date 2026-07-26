import { Card, Tabs, Typography, Table, Statistic, Row, Col, Empty } from 'antd'

const { Title } = Typography

function Analysis() {
  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        数据分析
      </Title>
      <Card>
        <Tabs
          items={[
            {
              key: 'overview',
              label: '指标概览',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={6}>
                    <Statistic title="平均反应时(ms)" value={512} />
                  </Col>
                  <Col xs={12} md={6}>
                    <Statistic title="正确率(%)" value={94.3} precision={1} />
                  </Col>
                  <Col xs={12} md={6}>
                    <Statistic title="样本量" value={128} />
                  </Col>
                  <Col xs={12} md={6}>
                    <Statistic title="显著水平" value="p<0.05" />
                  </Col>
                </Row>
              ),
            },
            {
              key: 'table',
              label: '数据明细',
              children: (
                <Table
                  size="small"
                  columns={[
                    { title: '被试', dataIndex: 'subject' },
                    { title: '条件', dataIndex: 'condition' },
                    { title: '反应时(ms)', dataIndex: 'rt' },
                    { title: '正确率', dataIndex: 'acc' },
                  ]}
                  dataSource={[
                    { key: '1', subject: 'S001', condition: 'A', rt: 498, acc: 0.95 },
                    { key: '2', subject: 'S002', condition: 'B', rt: 521, acc: 0.93 },
                    { key: '3', subject: 'S003', condition: 'A', rt: 487, acc: 0.96 },
                  ]}
                  pagination={false}
                />
              ),
            },
            {
              key: 'chart',
              label: '图表分析',
              children: (
                <Empty description="图表组件（Ant Design Charts）将在后续接入" />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default Analysis
