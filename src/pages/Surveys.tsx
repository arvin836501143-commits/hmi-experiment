import { Card, Form, Input, Radio, Slider, Button, Typography, Space, Rate, App } from 'antd'
import { SendOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography
const { TextArea } = Input

function Surveys() {
  const { message } = App.useApp()

  const onFinish = (values: unknown) => {
    console.log('问卷提交：', values)
    message.success('问卷已提交（纯前端演示，数据未持久化）')
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        调研问卷
      </Title>
      <Card title="示例调研问卷（演示用）">
        <Paragraph type="secondary">
          以下为表单录入演示，用于验证纯前端流程。后续将替换为论文中的真实调研内容。
        </Paragraph>
        <Form layout="vertical" style={{ maxWidth: 640 }} onFinish={onFinish}>
          <Form.Item
            label="被试编号"
            name="subjectId"
            rules={[{ required: true, message: '请输入被试编号' }]}
          >
            <Input placeholder="例如 S001" />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Radio.Group>
              <Radio value="male">男</Radio>
              <Radio value="female">女</Radio>
              <Radio value="other">其他</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="年龄" name="age">
            <Slider
              min={10}
              max={80}
              marks={{ 10: '10', 30: '30', 50: '50', 80: '80' }}
            />
          </Form.Item>
          <Form.Item label="对实验界面的满意度" name="satisfaction">
            <Rate />
          </Form.Item>
          <Form.Item label="主观反馈" name="feedback">
            <TextArea rows={4} placeholder="请输入您的反馈" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                提交问卷
              </Button>
              <Button htmlType="reset">重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Surveys
