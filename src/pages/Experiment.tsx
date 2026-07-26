import { useState } from 'react'
import { Card, Result, Button, Typography, Space, Statistic, Tag, Divider, theme } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import Flow1Screening from '../components/experiment/Flow1Screening'
import Flow2EFT from '../components/experiment/Flow2EFT'
import Flow4Takeover from '../components/experiment/Flow4Takeover'
import Flow5Survey from '../components/experiment/Flow5Survey'
import ExperimentHeader, { HEADER_HEIGHT } from '../components/experiment/ExperimentHeader'
import { LAYOUT_LABELS } from '../config/hmi'
import type {
  DemographicData,
  EFTResult,
  ExperimentPhase,
  DisqualifyReason,
  TakeoverResult,
  SurveyResult,
  ExperimentRecord,
} from '../types/experiment'

const { Text } = Typography

/** 不合格原因 → 提示文案 */
const DISQUALIFY_MESSAGES: Record<string, { title: string; subTitle: string }> = {
  no_license: {
    title: '感谢您的参与',
    subTitle: '本实验要求被试持有有效机动车驾驶证。很遗憾您不符合本次实验的入组条件，感谢您的时间！',
  },
  color_blind_1: {
    title: '感谢您的参与',
    subTitle: '本实验包含对座舱界面中红色碰撞预警信号的快速识别，需确保视觉色彩辨识正常。色盲筛查未通过，感谢您的时间！',
  },
  color_blind_2: {
    title: '感谢您的参与',
    subTitle: '本实验包含对座舱界面中红色碰撞预警信号的快速识别，需确保视觉色彩辨识正常。色盲筛查未通过，感谢您的时间！',
  },
}

/** 阶段 → 步骤索引映射（4 步：信息采集 → 图形测验 → 接管测试 → 主观调研） */
const PHASE_TO_STEP: Record<ExperimentPhase, number> = {
  screening: 0,
  eft: 1,
  takeover: 2,
  survey: 3,
  complete: 3,
  disqualified: 0,
}

function Experiment() {
  const navigate = useNavigate()
  const { token } = theme.useToken()

  const [phase, setPhase] = useState<ExperimentPhase>('screening')
  const [demographicData, setDemographicData] = useState<DemographicData | null>(null)
  const [eftResult, setEftResult] = useState<EFTResult | null>(null)
  const [takeoverResult, setTakeoverResult] = useState<TakeoverResult | null>(null)
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null)
  const [disqualifyReason, setDisqualifyReason] = useState<DisqualifyReason>(null)

  /** 流程一完成 → 保存人口学数据并进入流程二 */
  const handleScreeningComplete = (data: DemographicData) => {
    setDemographicData(data)
    setPhase('eft')
  }

  /** 流程一不合格 → 保存数据并终止 */
  const handleDisqualify = (reason: DisqualifyReason, data: DemographicData) => {
    setDisqualifyReason(reason)
    setDemographicData(data)

    // 即使不合格也保存人口学数据，便于分析被试流失情况
    const record: ExperimentRecord = {
      timestamp: new Date().toISOString(),
      demographic: data,
      eft: null,
      takeover: null,
      survey: null,
    }
    console.log('[ExperimentRecord] 被试不合格，已保存人口学数据：', record)
    try {
      const records = JSON.parse(
        localStorage.getItem('experiment_records') || '[]',
      ) as ExperimentRecord[]
      records.push(record)
      localStorage.setItem('experiment_records', JSON.stringify(records))
    } catch {
      console.warn('[ExperimentRecord] localStorage 写入失败')
    }

    setPhase('disqualified')
  }

  /** 流程二完成 → 进入接管测试（接管测试内部包含视频观看） */
  const handleEFTComplete = (result: EFTResult) => {
    setEftResult(result)
    setPhase('takeover')
  }

  /** 流程四完成 → 进入流程五 */
  const handleTakeoverComplete = (result: TakeoverResult) => {
    setTakeoverResult(result)
    setPhase('survey')
  }

  /** 流程五完成 → 汇总全部数据并进入完成页 */
  const handleSurveyComplete = (result: SurveyResult) => {
    setSurveyResult(result)

    // 汇总完整实验数据
    const record: ExperimentRecord = {
      timestamp: new Date().toISOString(),
      demographic: demographicData,
      eft: eftResult,
      takeover: takeoverResult,
      survey: result,
    }

    // 输出到控制台，便于调试与后端集成验证
    console.log('[ExperimentRecord] 完整实验数据：', record)
    console.log('[ExperimentRecord] JSON：', JSON.stringify(record, null, 2))

    // 存入 localStorage，防止页面刷新丢失，供后端集成时读取
    try {
      const records = JSON.parse(
        localStorage.getItem('experiment_records') || '[]',
      ) as ExperimentRecord[]
      records.push(record)
      localStorage.setItem('experiment_records', JSON.stringify(records))
      console.log(
        '[ExperimentRecord] 已存入 localStorage，累计记录数：',
        records.length,
      )
    } catch {
      console.warn('[ExperimentRecord] localStorage 写入失败')
    }

    setPhase('complete')
  }

  const currentStep = PHASE_TO_STEP[phase]

  // ---- 不合格页面 ----
  if (phase === 'disqualified' && disqualifyReason) {
    const msg = DISQUALIFY_MESSAGES[disqualifyReason]
    return (
      <>
        <ExperimentHeader currentStep={currentStep} />
        <div
          style={{
            minHeight: '100vh',
            background: '#141414',
            display: 'flex',
            flexDirection: 'column',
            padding: `${HEADER_HEIGHT + 16}px 16px 16px`,
          }}
        >
          <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Card
              style={{
                width: '100%',
                maxWidth: 800,
                margin: '0 auto',
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
              }}
            >
              <Result
                icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                title={msg.title}
                subTitle={msg.subTitle}
              />
            </Card>
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
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Button type="primary" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ---- 全部完成页面 ----
  if (phase === 'complete') {
    return (
      <>
        <ExperimentHeader currentStep={currentStep} />
        <div
          style={{
            minHeight: '100vh',
            background: '#141414',
            display: 'flex',
            flexDirection: 'column',
            padding: `${HEADER_HEIGHT + 16}px 16px 16px`,
          }}
        >
          <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <Card
              style={{
                width: '100%',
                maxWidth: 800,
                margin: '0 auto',
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
              }}
            >
              <Result
                icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                title="实验全部完成"
                subTitle="感谢您参与本次智能座舱 HMI 交互实验！您的数据已记录。"
              >
              <div style={{ maxWidth: 680, margin: '0 auto' }}>
                {/* EFT 结果 */}
                {eftResult && (
                  <>
                    <Divider titlePlacement="start" plain>
                      <Text type="secondary">镶嵌图形测验（EFT）</Text>
                    </Divider>
                    <Space size="large" style={{ justifyContent: 'center', display: 'flex', marginBottom: 16 }}>
                      <Statistic title="总分" value={`${eftResult.totalScore} / 10`} />
                      <Statistic
                        title="认知风格"
                        value={eftResult.totalScore >= 7 ? '场独立型 (FI)' : '场依存型 (FD)'}
                      />
                      {eftResult.avgCorrectResponseTime !== null && (
                        <Statistic
                          title="正确题平均反应时"
                          value={Math.round(eftResult.avgCorrectResponseTime)}
                          suffix="ms"
                        />
                      )}
                    </Space>
                  </>
                )}

                {/* 接管绩效结果 */}
                {takeoverResult && (
                  <>
                    <Divider titlePlacement="start" plain>
                      <Text type="secondary">L3 接管绩效测试</Text>
                    </Divider>
                    <Space size="large" wrap style={{ justifyContent: 'center', display: 'flex', marginBottom: 16 }}>
                      {takeoverResult.trials.map((t, i) => (
                        <Statistic
                          key={i}
                          title={
                            <Space size={6}>
                              <span>{LAYOUT_LABELS[t.layout]}</span>
                              <Tag color={t.hit ? 'success' : 'error'} style={{ marginInlineEnd: 0 }}>
                                {t.hit ? '命中' : '未命中'}
                              </Tag>
                            </Space>
                          }
                          value={Math.round(t.reactionTime)}
                          suffix="ms"
                          valueStyle={{ color: t.hit ? token.colorPrimary : '#ff4d4f' }}
                        />
                      ))}
                    </Space>
                    <Space size="large" style={{ justifyContent: 'center', display: 'flex', marginBottom: 16 }}>
                      <Statistic
                        title="平均反应时"
                        value={
                          takeoverResult.trials.length > 0
                            ? Math.round(
                                takeoverResult.trials.reduce((s, t) => s + t.reactionTime, 0) /
                                  takeoverResult.trials.length,
                              )
                            : 0
                        }
                        suffix="ms"
                      />
                      <Statistic
                        title="命中数"
                        value={takeoverResult.trials.filter((t) => t.hit).length}
                        suffix={`/ ${takeoverResult.trials.length}`}
                      />
                    </Space>
                  </>
                )}

                {/* 主观调研结果 */}
                {surveyResult && (
                  <>
                    <Divider titlePlacement="start" plain>
                      <Text type="secondary">NASA-TLX 主观调研</Text>
                    </Divider>
                    <Space direction="vertical" size={4} style={{ display: 'flex', alignItems: 'center' }}>
                      <Text type="secondary">
                        已完成布局数：{surveyResult.results.length} / 3
                      </Text>
                      <Text type="secondary">
                        呈现顺序：{surveyResult.results.map((r) => LAYOUT_LABELS[r.layout]).join(' → ')}
                      </Text>
                    </Space>
                  </>
                )}
              </div>
            </Result>
          </Card>
          {/* 底部操作栏 */}
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
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </div>
          </div>
        </div>
      </>
    )
  }

  // ---- 主流程布局（所有阶段共享顶部栏）----
  return (
    <div
      style={{
        height: '100vh',
        background: '#141414',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ExperimentHeader currentStep={currentStep} />

      {/* 内容区域：为顶部栏留出空间 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: `${HEADER_HEIGHT + 8}px 16px 8px`,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* 普通流程（screening / eft）：限制 800px 宽度 */}
        {(phase === 'screening' || phase === 'eft') && (
          <div
            style={{
              width: '100%',
              maxWidth: 800,
              margin: '0 auto',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {phase === 'screening' && (
              <Flow1Screening
                onComplete={handleScreeningComplete}
                onDisqualify={handleDisqualify}
              />
            )}
            {phase === 'eft' && <Flow2EFT onComplete={handleEFTComplete} />}
          </div>
        )}

        {/* 全屏流程（takeover）：样机填满整个视口宽度 */}
        {phase === 'takeover' && (
          <div
            style={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <Flow4Takeover onComplete={handleTakeoverComplete} />
          </div>
        )}

        {/* 调研流程（survey）：样机+侧边栏填满整个视口宽度 */}
        {phase === 'survey' && (
          <div
            style={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <Flow5Survey onComplete={handleSurveyComplete} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Experiment
