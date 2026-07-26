import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Result, Slider, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, ExperimentOutlined } from '@ant-design/icons'
import CockpitContainer from './CockpitContainer'
import { HEADER_HEIGHT } from './ExperimentHeader'
import { LAYOUT_LABELS, SURVEY_HMI_CONFIG } from '../../config/hmi'
import {
  LATIN_SQUARE_SEQUENCES,
  type HMILayout,
  type SurveyLayoutResult,
  type SurveyResult,
  type TLXDimension,
} from '../../types/experiment'

const { Paragraph, Text } = Typography

interface Flow5SurveyProps {
  onComplete: (result: SurveyResult) => void
}

type Phase = 'instruction' | 'survey' | 'complete'

interface TLXDimConfig {
  key: TLXDimension
  name: string
  enName: string
  icon: string
  question: string
  leftLabel: string
  rightLabel: string
  leftEmoji: string
  rightEmoji: string
  /** 是否在最终计分时进行反向转换（仅 performance 维度） */
  reverseScored: boolean
}

/** NASA-TLX 六维度配置（复刻自飞书文档） */
const TLX_DIMENSIONS: TLXDimConfig[] = [
  {
    key: 'mentalDemand',
    name: '脑力要求',
    enName: 'Mental Demand',
    icon: '🧠',
    question: '获取该布局信息、搜寻目标并做出识别时，您的思考、计算和决策负荷如何？',
    leftLabel: '极其繁重，极其烧脑',
    rightLabel: '极其轻松，无需动脑',
    leftEmoji: '😫',
    rightEmoji: '😊',
    reverseScored: false,
  },
  {
    key: 'physicalDemand',
    name: '体力要求',
    enName: 'Physical Demand',
    icon: '🦾',
    question:
      '在进行视线偏置扫视以及操控鼠标/触控板点击时，您感受到的身体动作负荷如何？',
    leftLabel: '极其繁重，身体疲累',
    rightLabel: '极其轻松，毫不费力',
    leftEmoji: '😫',
    rightEmoji: '😊',
    reverseScored: false,
  },
  {
    key: 'temporalDemand',
    name: '时间要求',
    enName: 'Temporal Demand',
    icon: '⏱️',
    question:
      '在看到预警信号时，当前界面布局是否导致您需要仓促做出判断，从而产生了强烈的时间压迫感与应变仓促感？',
    leftLabel: '布局慌乱，极度仓促',
    rightLabel: '布局清晰，从容有裕',
    leftEmoji: '😫',
    rightEmoji: '😊',
    reverseScored: false,
  },
  {
    key: 'performance',
    name: '作业绩效',
    enName: 'Performance',
    icon: '🎯',
    question:
      '您对自己刚刚成功确认红车碰撞预警任务的准确性与反应速度的主观满意度如何？',
    leftLabel: '极不满意，表现极差',
    rightLabel: '极度满意，表现完美',
    leftEmoji: '😫',
    rightEmoji: '😊',
    reverseScored: false,
  },
  {
    key: 'effort',
    name: '努力程度',
    enName: 'Effort',
    icon: '💦',
    question:
      '为了成功命中红车危险热区，您必须调动全神贯注精神资源的艰苦程度如何？',
    leftLabel: '竭尽全力，高度紧张',
    rightLabel: '毫不费力，轻松完成',
    leftEmoji: '😫',
    rightEmoji: '😊',
    reverseScored: false,
  },
  {
    key: 'frustration',
    name: '挫败感',
    enName: 'Frustration Level',
    icon: '😣',
    question:
      '在面对刚刚那一套界面布局时，您内心是否产生了焦躁、困惑、无力或不安全等消极情绪？',
    leftLabel: '极度挫败，非常焦躁',
    rightLabel: '极其笃定，毫无挫败',
    leftEmoji: '😫',
    rightEmoji: '😊',
    reverseScored: false,
  },
]

const INSTRUCTION_TEXT =
  '请根据您刚刚在完成当前 HMI 界面布局（SR主导布局 / 导航主导布局 / 均衡布局）条件下的突发碰撞预警点击任务时的切身体会，拖动下方对应的无极滑块条（分值区间为 0 - 100）进行客观评分。'

/** 创建全为 null 的初始评分（未作答状态） */
function createEmptyRatings(): Record<TLXDimension, number | null> {
  return {
    mentalDemand: null,
    physicalDemand: null,
    temporalDemand: null,
    performance: null,
    effort: null,
    frustration: null,
  }
}

/**
 * 渲染滑块两端的「表情 + 文字」标签。
 * 使用 span + display:block 以保持 span-in-span 的合法结构。
 */
function renderMarkLabel(
  emoji: string,
  text: string,
  align: 'left' | 'right',
) {
  return (
    <span
      style={{
        display: 'block',
        width: 104,
        fontSize: 11,
        lineHeight: 1.4,
        whiteSpace: 'normal',
        textAlign: align,
        color: 'rgba(255, 255, 255, 0.65)',
      }}
    >
      <span style={{ display: 'block', fontSize: 15, lineHeight: 1.2 }}>
        {emoji}
      </span>
      <span style={{ display: 'block' }}>{text}</span>
    </span>
  )
}

function Flow5Survey({ onComplete }: Flow5SurveyProps) {
  // 拉丁方序列：组件挂载时随机选择一条
  const [sequence] = useState<HMILayout[]>(() => {
    const idx = Math.floor(Math.random() * LATIN_SQUARE_SEQUENCES.length)
    return LATIN_SQUARE_SEQUENCES[idx]
  })

  const [phase, setPhase] = useState<Phase>('instruction')
  const [layoutIndex, setLayoutIndex] = useState(0)
  const [results, setResults] = useState<SurveyLayoutResult[]>([])
  const [ratings, setRatings] = useState<Record<TLXDimension, number | null>>(
    createEmptyRatings,
  )

  const sidebarScrollRef = useRef<HTMLDivElement>(null)
  /** 各维度卡片的 ref，用于滚动定位 */
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  const currentLayout = sequence[layoutIndex]
  const totalLayouts = sequence.length
  const allAnswered = TLX_DIMENSIONS.every((d) => ratings[d.key] !== null)

  // 切换布局时，侧边栏滚动回顶部
  useEffect(() => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = 0
    }
  }, [layoutIndex])

  /**
   * 检查当前可视区域内最后一个已作答的滑块，
   * 若其后还有未作答的滑块，则自动平滑滚动至下一个未作答滑块。
   */
  const autoScrollToNext = useCallback(
    (justAnsweredKey: TLXDimension) => {
      const scrollEl = sidebarScrollRef.current
      if (!scrollEl) return

      const justAnsweredIdx = TLX_DIMENSIONS.findIndex(
        (d) => d.key === justAnsweredKey,
      )
      if (justAnsweredIdx < 0 || justAnsweredIdx >= TLX_DIMENSIONS.length - 1)
        return

      // 找到下一个未作答的维度
      let nextIdx = -1
      for (let i = justAnsweredIdx + 1; i < TLX_DIMENSIONS.length; i++) {
        if (ratings[TLX_DIMENSIONS[i].key] === null) {
          nextIdx = i
          break
        }
      }
      if (nextIdx === -1) return // 后面都已作答，无需滚动

      const justAnsweredCard = cardRefs.current[justAnsweredIdx]
      const nextCard = cardRefs.current[nextIdx]
      if (!justAnsweredCard || !nextCard) return

      // 判断刚作答的卡片是否在可视区域内
      const scrollRect = scrollEl.getBoundingClientRect()
      const cardRect = justAnsweredCard.getBoundingClientRect()
      const isVisible =
        cardRect.top >= scrollRect.top - 20 &&
        cardRect.bottom <= scrollRect.bottom + 20

      if (!isVisible) return

      // 判断下一个卡片是否已经可见（不需要滚动）
      const nextRect = nextCard.getBoundingClientRect()
      const nextVisible =
        nextRect.top >= scrollRect.top - 20 &&
        nextRect.bottom <= scrollRect.bottom + 20
      if (nextVisible) return

      // 平滑滚动到下一个卡片
      const targetTop =
        nextCard.offsetTop - scrollEl.offsetTop - 12
      scrollEl.scrollTo({ top: targetTop, behavior: 'smooth' })
    },
    [ratings],
  )

  const finalResult = useMemo<SurveyResult>(
    () => ({ sequence, results }),
    [sequence, results],
  )

  const handleStart = () => {
    setPhase('survey')
    setLayoutIndex(0)
    setResults([])
    setRatings(createEmptyRatings())
  }

  const handleRatingChange = (dim: TLXDimension, value: number) => {
    setRatings((prev) => ({ ...prev, [dim]: value }))
    // 拖动结束后延迟触发自动滚动，等待 state 更新
    setTimeout(() => autoScrollToNext(dim), 300)
  }

  const handleCompleteLayout = () => {
    if (!allAnswered) return
    const layoutResult: SurveyLayoutResult = {
      layout: currentLayout,
      ratings: ratings as Record<TLXDimension, number>,
    }
    const newResults = [...results, layoutResult]
    setResults(newResults)

    if (layoutIndex >= totalLayouts - 1) {
      // 三种布局全部完成
      setPhase('complete')
    } else {
      // 切换到下一个布局：座舱样机不变，仅切换 HMI 图片并清空滑块
      setLayoutIndex((i) => i + 1)
      setRatings(createEmptyRatings())
    }
  }

  const handleFinish = () => {
    onComplete(finalResult)
  }

  // ---------------- 指导语页面 ----------------
  if (phase === 'instruction') {
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
        >
          <Result
            icon={<ExperimentOutlined style={{ color: '#1677ff' }} />}
            title="主观心理负荷与用户偏好调研"
            subTitle="基于 NASA-TLX 量表的三种 HMI 布局主观评价"
          >
            <div
              style={{
                maxWidth: 640,
                margin: '0 auto',
                textAlign: 'left',
              }}
            >
              <Paragraph>
                本调研将依次呈现 <Text strong>3 种</Text> 座舱 HMI
                布局（SR 主导 / 导航主导 / 均衡），呈现顺序已通过{' '}
                <Text strong>拉丁方设计</Text> 进行平衡。在每种布局下，您需要：
              </Paragraph>
              <ul style={{ marginTop: 4, marginBottom: 16 }}>
                <li>观察左侧座舱样机中显示的 HMI 界面布局；</li>
                <li>
                  在右侧侧边栏针对 6 个维度（脑力要求、体力要求、时间要求、作业绩效、努力程度、挫败感）拖动
                  0 - 100 无极滑块进行评分；
                </li>
                <li>完成全部 6 个维度后点击「完成」按钮进入下一种布局。</li>
              </ul>
              <Paragraph strong style={{ marginBottom: 8 }}>
                指导语
              </Paragraph>
              <Paragraph>{INSTRUCTION_TEXT}</Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                提示：每个滑块初始为「未作答」状态，需拖动后方可提交；「作业绩效」维度在最终计分时将自动进行反向转换。
              </Paragraph>
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
          <Button type="primary" onClick={handleStart}>开始调研</Button>
        </div>
      </div>
    )
  }

  // ---------------- 完成页面 ----------------
  if (phase === 'complete') {
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
        >
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="调研完成"
            subTitle="您已完成全部 3 种 HMI 布局的主观评价，感谢您的参与！"
          >
            <Space
              direction="vertical"
              size={4}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <Text type="secondary">
                已评价布局数：{finalResult.results.length} / {totalLayouts}
              </Text>
              <Text type="secondary">
                呈现顺序：
                {finalResult.results
                  .map((r) => LAYOUT_LABELS[r.layout])
                  .join(' → ')}
              </Text>
            </Space>
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
          <Button type="primary" onClick={handleFinish}>结束实验</Button>
        </div>
      </div>
    )
  }

  // ---------------- 调研阶段 ----------------
  const hmiImage = SURVEY_HMI_CONFIG[currentLayout].image

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: `calc(100vh - ${HEADER_HEIGHT + 16}px)`,
        minHeight: 520,
      }}
    >
      {/* 顶部标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#1f1f1f',
          borderRadius: 12,
          marginBottom: 12,
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
          flex: '0 0 auto',
        }}
      >
        <Space>
          <ExperimentOutlined style={{ color: '#1677ff', fontSize: 18 }} />
          <Text strong style={{ fontSize: 16 }}>
            主观心理负荷与用户偏好调研（NASA-TLX）
          </Text>
        </Space>
        <Space size="large">
          <Text type="secondary">
            当前布局：<Text strong>{layoutIndex + 1}</Text> / {totalLayouts}
          </Text>
          <Tag color="blue">{LAYOUT_LABELS[currentLayout]}</Tag>
        </Space>
      </div>

      {/* 主体：左座舱 + 右侧边栏 */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>
        {/* 左侧：座舱样机 + HMI（约 65% 宽度） */}
        <div
          style={{
            flex: '0 1 65%',
            minWidth: 0,
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <CockpitContainer>
            <img
              src={hmiImage}
              alt={`${LAYOUT_LABELS[currentLayout]} HMI`}
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </CockpitContainer>
        </div>

        {/* 右侧：调研侧边栏（约 35% 宽度） */}
        <div
          style={{
            flex: '0 1 35%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#1f1f1f',
            borderRadius: 12,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          }}
        >
          {/* 侧边栏头部：当前布局名称 + 指导语 */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              flex: '0 0 auto',
            }}
          >
            <Text strong style={{ fontSize: 15 }}>
              {LAYOUT_LABELS[currentLayout]}（{layoutIndex + 1} / {totalLayouts}）
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {INSTRUCTION_TEXT}
              </Text>
            </div>
          </div>

          {/* 可滚动内容：6 个维度的滑块 */}
          <div
            ref={sidebarScrollRef}
            style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {TLX_DIMENSIONS.map((dim, idx) => {
                const value = ratings[dim.key]
                const answered = value !== null
                // marks 仅在 0 和 100 两端显示标签；
                // 通过 per-mark style 覆盖 rc-slider 默认的 translateX(-50%)，
                // 使两端标签分别左对齐 / 右对齐，避免长文字溢出滑块两侧。
                const marks = {
                  0: {
                    label: renderMarkLabel(
                      dim.leftEmoji,
                      dim.leftLabel,
                      'left',
                    ),
                    style: { transform: 'translateX(0%)' },
                  },
                  100: {
                    label: renderMarkLabel(
                      dim.rightEmoji,
                      dim.rightLabel,
                      'right',
                    ),
                    style: { transform: 'translateX(-100%)' },
                  },
                }
                return (
                  <div
                    key={dim.key}
                    ref={(el) => {
                      cardRefs.current[idx] = el
                    }}
                  >
                    <Card
                      size="small"
                      styles={{ body: { padding: 12 } }}
                    >
                    {/* 维度标题行 */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Text strong>
                        <span style={{ marginRight: 6 }}>{dim.icon}</span>
                        {dim.name}
                        <Text
                          type="secondary"
                          style={{ fontWeight: 'normal', marginLeft: 6 }}
                        >
                          {dim.enName}
                        </Text>
                      </Text>
                      {dim.reverseScored && (
                        <Tag color="orange">反向计分</Tag>
                      )}
                    </div>

                    {/* 问题描述 */}
                    <Paragraph style={{ marginBottom: 12, fontSize: 13 }}>
                      {dim.question}
                    </Paragraph>

                    {/* 0-100 无极滑块 */}
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      /*
                       * antd Slider 类型声明 value 为 number，但底层 rc-slider
                       * 运行时支持 null（表示未作答：不渲染滑块手柄与已选轨道）。
                       * 此处通过类型断言传入 null，以呈现「未作答」初始状态。
                       */
                      value={value as number}
                      marks={marks}
                      onChange={(v) => handleRatingChange(dim.key, v)}
                    />

                    {/* 当前值显示（滑块下方） */}
                    <div style={{ textAlign: 'center', marginTop: 4 }}>
                      {answered ? (
                        <Text strong>当前评分：{value}</Text>
                      ) : (
                        <Text type="secondary">尚未作答，请拖动滑块</Text>
                      )}
                    </div>
                    </Card>
                  </div>
                )
              })}
            </Space>
          </div>

          {/* 侧边栏底部：完成按钮（固定） */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              flex: '0 0 auto',
              background: '#1a1a1a',
            }}
          >
            <Button
              type="primary"
              size="large"
              block
              disabled={!allAnswered}
              onClick={handleCompleteLayout}
            >
              {layoutIndex >= totalLayouts - 1
                ? '完成并提交调研'
                : '完成当前布局，进入下一个'}
            </Button>
            {!allAnswered && (
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  请完成全部 6 个维度的评分后再提交
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Flow5Survey
