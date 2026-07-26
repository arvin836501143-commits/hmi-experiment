import { useCallback, useState } from 'react'
import {
  App,
  Button,
  Card,
  Checkbox,
  Form,
  InputNumber,
  Radio,
  Steps,
  Typography,
} from 'antd'
import IshiharaPlate from './IshiharaPlate'
import type { DemographicData, DisqualifyReason } from '../../types/experiment'

const { Title, Paragraph, Text } = Typography

interface Flow1ScreeningProps {
  onComplete: (data: DemographicData) => void
  onDisqualify: (reason: DisqualifyReason, data: DemographicData) => void
}

/** 步骤进度条配置 */
const stepItems = [
  { title: '知情同意', description: '实验须知' },
  { title: '基本信息', description: '人口学资料' },
  { title: '驾驶经验', description: '驾驶背景' },
  { title: '视觉筛选', description: '视力与色觉' },
]

/** 每一步需要校验的字段名 */
const stepFields: string[][] = [
  ['consent'],
  ['age', 'gender', 'education', 'occupation'],
  ['hasLicense', 'drivingYears', 'annualMileage'],
  ['visionStatus', 'colorBlindTest1', 'colorBlindTest2'],
]

/** 色盲检查图卡片容器样式（适配暗色主题） */
const plateWrapperStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: 16,
  marginBottom: 16,
  background: 'rgba(255, 255, 255, 0.04)',
  borderRadius: 12,
}

function Flow1Screening({ onComplete, onDisqualify }: Flow1ScreeningProps) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [current, setCurrent] = useState(0)

  /** 最终提交：按优先级判定不合格原因，否则完成 */
  const handleSubmit = () => {
    const values = form.getFieldsValue(true)
    const data: DemographicData = {
      age: values.age ?? null,
      gender: values.gender ?? null,
      education: values.education ?? '',
      occupation: values.occupation ?? '',
      hasLicense: values.hasLicense ?? null,
      drivingYears: values.drivingYears ?? '',
      annualMileage: values.annualMileage ?? '',
      visionStatus: values.visionStatus ?? '',
      colorBlindTest1: values.colorBlindTest1 ?? '',
      colorBlindTest2: values.colorBlindTest2 ?? '',
    }

    // 不合格判定优先级：无驾驶证 -> 色盲题1 -> 色盲题2
    if (data.hasLicense === 'no') {
      onDisqualify('no_license', data)
      return
    }
    if (data.colorBlindTest1 !== '74') {
      onDisqualify('color_blind_1', data)
      return
    }
    if (data.colorBlindTest2 !== 'circle') {
      onDisqualify('color_blind_2', data)
      return
    }

    onComplete(data)
  }

  /** 下一步 / 提交：先校验当前步字段 */
  const handleNext = async () => {
    try {
      await form.validateFields(stepFields[current])
    } catch {
      message.warning('请完整填写本步骤的所有必填项后再继续')
      return
    }

    if (current < stepFields.length - 1) {
      setCurrent(current + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrev = () => {
    setCurrent((prev) => Math.max(0, prev - 1))
  }

  /**
   * 表单值变化时，自动滚动到当前步骤中下一个未填写的字段。
   * - 仅对 Radio 选择触发（跳过 InputNumber 的逐字输入）
   * - 使用 block: 'nearest' 仅在目标不可见时才滚动
   */
  const handleValuesChange = useCallback(
    (
      changedValues: Record<string, unknown>,
      allValues: Record<string, unknown>,
    ) => {
      const changedField = Object.keys(changedValues)[0]
      if (!changedField) return

      const currentStepFields = stepFields[current]
      if (!currentStepFields.includes(changedField)) return
      if (changedField === 'consent') return

      const changedValue = changedValues[changedField]
      if (
        changedValue === undefined ||
        changedValue === null ||
        changedValue === '' ||
        changedValue === false
      )
        return
      // 跳过 InputNumber 的逐字输入，避免打断用户输入
      if (typeof changedValue === 'number') return

      // 查找当前步骤中下一个未填写的字段
      const changedIdx = currentStepFields.indexOf(changedField)
      for (let i = changedIdx + 1; i < currentStepFields.length; i++) {
        const nextField = currentStepFields[i]
        const nextValue = allValues[nextField]
        const isEmpty =
          nextValue === undefined ||
          nextValue === null ||
          nextValue === '' ||
          nextValue === false
        if (isEmpty) {
          setTimeout(() => {
            const el = document.getElementById(nextField)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 300)
          break
        }
      }
    },
    [current],
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 800,
          margin: '0 auto',
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
        }}
        styles={{ body: { paddingBottom: 0 } }}
      >
        <Title level={4} style={{ marginTop: 0, marginBottom: 24 }}>
          被试招募与信息采集
        </Title>

        <Steps
          current={current}
          items={stepItems}
          size="small"
          style={{ marginBottom: 32 }}
        />

        <Form form={form} layout="vertical" requiredMark onValuesChange={handleValuesChange}>
          <div style={{ minHeight: 280 }}>
            {/* 第 0 步：知情同意书 */}
            {current === 0 && (
              <div>
                <Paragraph>
                  <Text strong>尊敬的参与者，您好！</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">感谢您关注本次驾驶认知与人机交互相关学术实验。在正式开始前，请仔细阅读以下说明：</Text>
                </Paragraph>

                <Paragraph>
                  <Text strong>一、研究目的</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">本研究旨在探究驾驶场景下的认知加工与视觉注意特征，为人机交互界面（HMI）设计与驾驶安全评估提供科学依据。</Text>
                </Paragraph>

                <Paragraph>
                  <Text strong>二、任务说明</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">实验包含基本信息采集、视觉与色觉筛查、镶嵌图形认知测验及驾驶视频判断任务。全程预计耗时约 20–30 分钟，全程无任何身体风险。</Text>
                </Paragraph>

                <Paragraph>
                  <Text strong>三、数据安全</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">您提供的所有信息仅用于学术研究，将以匿名化方式存储与分析，不会涉及您的真实姓名、联系方式等可识别身份的信息，亦不会用于任何商业用途。</Text>
                </Paragraph>

                <Paragraph>
                  <Text strong>四、知情同意</Text>
                </Paragraph>
                <Paragraph>
                  <Text type="secondary">您的参与完全自愿，有权在任何时刻中止实验而无需说明理由，且不会因此承担任何不利后果。继续即表示您已理解并同意上述说明。</Text>
                </Paragraph>

                <Form.Item
                  name="consent"
                  valuePropName="checked"
                  rules={[
                    {
                      validator: (_, value) =>
                        value
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error('请阅读并同意上述说明后方可继续'),
                            ),
                    },
                  ]}
                >
                  <Checkbox>
                    我已仔细阅读并理解上述说明，同意作为被试参加本次学术实验
                  </Checkbox>
                </Form.Item>
              </div>
            )}

            {/* 第 1 步：人口学基本信息 */}
            {current === 1 && (
              <div>
                <Form.Item
                  label="年龄"
                  name="age"
                  rules={[{ required: true, message: '请输入年龄' }]}
                >
                  <InputNumber
                    min={18}
                    max={50}
                    style={{ width: '100%' }}
                    placeholder="请输入 18-50 之间的年龄"
                  />
                </Form.Item>

                <Form.Item
                  label="生理性别"
                  name="gender"
                  rules={[{ required: true, message: '请选择生理性别' }]}
                >
                  <Radio.Group>
                    <Radio value="male">男</Radio>
                    <Radio value="female">女</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="最高受教育程度"
                  name="education"
                  rules={[{ required: true, message: '请选择受教育程度' }]}
                >
                  <Radio.Group>
                    <Radio value="大专">大专</Radio>
                    <Radio value="本科">本科</Radio>
                    <Radio value="硕士及以上">硕士及以上</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="当前职业类别"
                  name="occupation"
                  rules={[{ required: true, message: '请选择职业类别' }]}
                >
                  <Radio.Group>
                    <Radio value="在校学生">在校学生</Radio>
                    <Radio value="职业驾驶员">职业驾驶员</Radio>
                    <Radio value="汽车行业或HMI交互设计或人因工程相关从业人员">
                      汽车行业或HMI交互设计或人因工程相关从业人员
                    </Radio>
                    <Radio value="其他行业从业人员">其他行业从业人员</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            )}

            {/* 第 2 步：驾驶经验 */}
            {current === 2 && (
              <div>
                <Form.Item
                  label="是否持有驾驶证"
                  name="hasLicense"
                  rules={[{ required: true, message: '请选择是否持有驾驶证' }]}
                >
                  <Radio.Group>
                    <Radio value="yes">是</Radio>
                    <Radio value="no">否</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="驾龄"
                  name="drivingYears"
                  rules={[{ required: true, message: '请选择驾龄' }]}
                >
                  <Radio.Group>
                    <Radio value="未满1年">未满1年</Radio>
                    <Radio value="1-3年">1-3年</Radio>
                    <Radio value="3-5年">3-5年</Radio>
                    <Radio value="5年以上">5年以上</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  label="年均行驶里程"
                  name="annualMileage"
                  rules={[{ required: true, message: '请选择年均行驶里程' }]}
                >
                  <Radio.Group>
                    <Radio value="<3000公里">{'<3000公里'}</Radio>
                    <Radio value="3000-10000公里">3000-10000公里</Radio>
                    <Radio value="10000-20000公里">10000-20000公里</Radio>
                    <Radio value=">20000公里">{'>20000公里'}</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            )}

            {/* 第 3 步：视觉健康筛选 */}
            {current === 3 && (
              <div>
                <Form.Item
                  label="视力状况"
                  name="visionStatus"
                  rules={[{ required: true, message: '请选择视力状况' }]}
                >
                  <Radio.Group>
                    <Radio value="正常或矫正视力良好">正常或矫正视力良好</Radio>
                    <Radio value="视力较弱或存在未矫正的近视远视散光">
                      视力较弱或存在未矫正的近视远视散光
                    </Radio>
                  </Radio.Group>
                </Form.Item>

                {/* 色盲测试题 1：数字 74 */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong>色盲测试题1：请辨认下图中的数字</Text>
                </div>
                <div style={plateWrapperStyle}>
                  <IshiharaPlate type="number" size={280} />
                </div>
                <Form.Item
                  name="colorBlindTest1"
                  rules={[{ required: true, message: '请选择你看到的数字' }]}
                  style={{ marginBottom: 24 }}
                >
                  <Radio.Group>
                    <Radio value="74">74</Radio>
                    <Radio value="21">21</Radio>
                    <Radio value="none">什么也看不清只有乱点</Radio>
                  </Radio.Group>
                </Form.Item>

                {/* 色盲测试题 2：圆形 */}
                <div style={{ marginBottom: 8 }}>
                  <Text strong>色盲测试题2：请辨认下图中的形状</Text>
                </div>
                <div style={plateWrapperStyle}>
                  <IshiharaPlate type="shape" size={280} />
                </div>
                <Form.Item
                  name="colorBlindTest2"
                  rules={[{ required: true, message: '请选择你看到的形状' }]}
                >
                  <Radio.Group>
                    <Radio value="circle">圆形</Radio>
                    <Radio value="triangle">三角形</Radio>
                    <Radio value="none">无法辨识</Radio>
                  </Radio.Group>
                </Form.Item>
              </div>
            )}
          </div>

        </Form>
      </Card>

      {/* 固定底部操作栏 */}
      <div
        style={{
          flex: '0 0 auto',
          maxWidth: 800,
          margin: '12px auto 0',
          width: '100%',
          padding: '12px 20px',
          background: '#1f1f1f',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Button onClick={handlePrev} disabled={current === 0}>
          上一步
        </Button>
        <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 12 }}>
          第 {current + 1} / {stepItems.length} 步
        </span>
        <Button type="primary" onClick={handleNext}>
          {current === stepItems.length - 1 ? '提交并进入实验' : '下一步'}
        </Button>
      </div>
    </div>
  )
}

export default Flow1Screening
