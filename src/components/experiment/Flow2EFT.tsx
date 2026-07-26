import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Progress, Radio, Result, Space, Statistic, Typography, theme } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'
import type { EFTResult, EFTQuestionResult } from '../../types/experiment'

const { Paragraph, Text } = Typography

interface Flow2EFTProps {
  onComplete: (result: EFTResult) => void
}

type Phase = 'welcome' | 'test' | 'result'

/** 每题作答时长（毫秒） */
const QUESTION_DURATION = 45000
/** 选择后延迟跳转（毫秒），给用户视觉确认 */
const ADVANCE_DELAY = 500
/** 倒计时视觉刷新间隔（毫秒） */
const TICK_INTERVAL = 100

/** 题目图片目录前缀 */
const IMG_DIR = '/questions/镶嵌图形实验-题目导出'

/** 题目数据：q 题号，answer 正确答案，各选项图片文件名 */
const QUESTIONS = [
  { q: 1, answer: 'C' as const, target: `${IMG_DIR}/1目标图形.jpg`,  A: `${IMG_DIR}/1A.jpg`,  B: `${IMG_DIR}/1B.jpg`,  C: `${IMG_DIR}/1C.jpg`,  D: `${IMG_DIR}/1D.jpg` },
  { q: 2, answer: 'A' as const, target: `${IMG_DIR}/2目标图形.jpg`,  A: `${IMG_DIR}/2A.jpg`,  B: `${IMG_DIR}/2B.jpg`,  C: `${IMG_DIR}/2C.jpg`,  D: `${IMG_DIR}/2D.jpg` },
  { q: 3, answer: 'D' as const, target: `${IMG_DIR}/3目标图形.jpg`,  A: `${IMG_DIR}/3A.jpg`,  B: `${IMG_DIR}/3B.jpg`,  C: `${IMG_DIR}/3C.jpg`,  D: `${IMG_DIR}/3D.jpg` },
  { q: 4, answer: 'B' as const, target: `${IMG_DIR}/4目标图形.jpg`,  A: `${IMG_DIR}/4A.jpg`,  B: `${IMG_DIR}/4B.jpg`,  C: `${IMG_DIR}/4C.jpg`,  D: `${IMG_DIR}/4D.jpg` },
  { q: 5, answer: 'C' as const, target: `${IMG_DIR}/5目标图形.jpg`,  A: `${IMG_DIR}/5A.jpg`,  B: `${IMG_DIR}/5B.jpg`,  C: `${IMG_DIR}/5C.jpg`,  D: `${IMG_DIR}/5D.jpg` },
  { q: 6, answer: 'A' as const, target: `${IMG_DIR}/6目标图形.jpg`,  A: `${IMG_DIR}/6A.jpg`,  B: `${IMG_DIR}/6B.jpg`,  C: `${IMG_DIR}/6C.jpg`,  D: `${IMG_DIR}/6D.jpg` },
  { q: 7, answer: 'D' as const, target: `${IMG_DIR}/7目标图形.jpg`,  A: `${IMG_DIR}/7A.jpg`,  B: `${IMG_DIR}/7B.jpg`,  C: `${IMG_DIR}/7C.jpg`,  D: `${IMG_DIR}/7D.jpg` },
  { q: 8, answer: 'B' as const, target: `${IMG_DIR}/8目标图形.jpg`,  A: `${IMG_DIR}/8A.jpg`,  B: `${IMG_DIR}/8B.jpg`,  C: `${IMG_DIR}/8C.jpg`,  D: `${IMG_DIR}/8D.jpg` },
  { q: 9, answer: 'C' as const, target: `${IMG_DIR}/9目标图形.jpg`,  A: `${IMG_DIR}/9A.jpg`,  B: `${IMG_DIR}/9B.jpg`,  C: `${IMG_DIR}/9C.jpg`,  D: `${IMG_DIR}/9D.jpg` },
  { q: 10, answer: 'A' as const, target: `${IMG_DIR}/10目标图形.jpg`, A: `${IMG_DIR}/10A.jpg`, B: `${IMG_DIR}/10B.jpg`, C: `${IMG_DIR}/10C.jpg`, D: `${IMG_DIR}/10D.jpg` },
] as const

const OPTIONS = ['A', 'B', 'C', 'D'] as const

/** 统一底部操作栏样式 */
const actionBarStyle: React.CSSProperties = {
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
}

function Flow2EFT({ onComplete }: Flow2EFTProps) {
  const { token } = theme.useToken()
  const [phase, setPhase] = useState<Phase>('welcome')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<EFTQuestionResult[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [startTime, setStartTime] = useState(0)
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION)
  const [locked, setLocked] = useState(false)

  const answeredRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (deadlineRef.current) {
      clearTimeout(deadlineRef.current)
      deadlineRef.current = null
    }
    if (advanceRef.current) {
      clearTimeout(advanceRef.current)
      advanceRef.current = null
    }
  }, [])

  /** 提交本题作答：option 为 null 表示超时未作答 */
  const submitAnswer = useCallback(
    (option: string | null, responseTime: number | null) => {
      if (answeredRef.current) return
      answeredRef.current = true
      setLocked(true)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (deadlineRef.current) {
        clearTimeout(deadlineRef.current)
        deadlineRef.current = null
      }

      const correct = option !== null && option === QUESTIONS[currentIndex].answer
      setSelectedOption(option)
      setResults((prev) => [
        ...prev,
        {
          questionIndex: currentIndex,
          selectedOption: option,
          isCorrect: correct,
          responseTime,
        },
      ])

      advanceRef.current = setTimeout(() => {
        advanceRef.current = null
        if (currentIndex >= QUESTIONS.length - 1) {
          setPhase('result')
        } else {
          setCurrentIndex((i) => i + 1)
        }
      }, ADVANCE_DELAY)
    },
    [currentIndex],
  )

  useEffect(() => {
    if (phase !== 'test') return

    answeredRef.current = false
    setSelectedOption(null)
    setLocked(false)
    const start = Date.now()
    setStartTime(start)
    setTimeLeft(QUESTION_DURATION)

    intervalRef.current = setInterval(() => {
      const left = Math.max(0, QUESTION_DURATION - (Date.now() - start))
      setTimeLeft(left)
    }, TICK_INTERVAL)

    deadlineRef.current = setTimeout(() => {
      deadlineRef.current = null
      submitAnswer(null, null)
    }, QUESTION_DURATION)

    return () => {
      clearTimers()
    }
  }, [phase, currentIndex, submitAnswer, clearTimers])

  /** 预加载所有题目图片 */
  useEffect(() => {
    const imgs: HTMLImageElement[] = []
    QUESTIONS.forEach((q) => {
      const paths = [q.target, q.A, q.B, q.C, q.D]
      paths.forEach((p) => {
        const img = new Image()
        img.src = p
        imgs.push(img)
      })
    })
    return () => { imgs.length = 0 }
  }, [])

  const startTest = () => {
    setResults([])
    setCurrentIndex(0)
    setPhase('test')
  }

  const totalScore = useMemo(
    () => results.filter((r) => r.isCorrect).length,
    [results],
  )
  const avgRT = useMemo(() => {
    const rts = results
      .filter((r) => r.isCorrect && r.responseTime !== null)
      .map((r) => r.responseTime as number)
    return rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : null
  }, [results])
  const isFI = totalScore >= 7

  const handleComplete = () => {
    const result: EFTResult = {
      results,
      totalScore,
      avgCorrectResponseTime: avgRT,
    }
    onComplete(result)
  }

  const percent = Math.max(0, Math.min(100, (timeLeft / QUESTION_DURATION) * 100))
  const currentQuestion = QUESTIONS[currentIndex]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* 指导语 */}
      {phase === 'welcome' && (
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
            title="镶嵌图形测验（EFT）"
            subTitle="用于评估您的认知风格：场独立型（FI）/ 场依存型（FD）"
          >
            <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
              <Paragraph>
                本测验共 <Text strong>{QUESTIONS.length} 道题</Text>。每题展示一个
                <Text strong> 目标图形</Text> 与四个复杂图形选项（A / B / C / D），
                请在复杂图形中找出包含目标图形的选项。
              </Paragraph>
              <Paragraph style={{ marginBottom: 4 }}>作答规则：</Paragraph>
              <ul style={{ marginTop: 4, marginBottom: 0 }}>
                <li>
                  每题限时 <Text strong>45 秒</Text>，超时未作答将自动跳转并计为错误。
                </li>
                <li>选择下方 A / B / C / D 单选按钮即可作答，选择后自动进入下一题。</li>
                <li>正式测验阶段不提供即时对错反馈，请凭第一判断作答。</li>
                <li>过程中请勿离开页面。</li>
              </ul>
            </div>
          </Result>
        </Card>
      )}

      {/* 测试阶段 */}
      {phase === 'test' && (
        <Card style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 题号 + 倒计时 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16 }}>
                第 <Text strong>{currentIndex + 1}</Text> / {QUESTIONS.length} 题
              </Text>
              <Progress
                type="circle"
                size={64}
                percent={percent}
                strokeColor={timeLeft <= 10000 ? '#ff4d4f' : undefined}
                format={() => `${Math.ceil(timeLeft / 1000)}s`}
              />
            </div>

            {/* 提示文字 */}
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                请选出包含目标图形的复杂图形
              </Text>
            </div>

            {/* 目标图形（居中，宽度与单个选项一致） */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '23%',
                  minWidth: 140,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    background: '#000',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={currentQuestion.target}
                    alt="目标图形"
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      userSelect: 'none',
                    }}
                  />
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 32,
                    borderRadius: 8,
                    background: '#3a3a3a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 14, fontWeight: 600 }}>
                    目标图形
                  </Text>
                </div>
              </div>
            </div>

            {/* A/B/C/D 选项横排 */}
            <Radio.Group
              value={selectedOption ?? undefined}
              onChange={(e) => {
                if (answeredRef.current || locked) return
                submitAnswer(String(e.target.value), Date.now() - startTime)
              }}
              style={{ display: 'flex', gap: 12, width: '100%' }}
            >
              {OPTIONS.map((opt) => {
                const isSelected = selectedOption === opt
                return (
                  <div
                    key={opt}
                    style={{
                      flex: '1 1 0',
                      minWidth: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        background: '#000',
                        borderRadius: 12,
                        border: isSelected
                          ? `2px solid ${token.colorPrimary}`
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxShadow: isSelected
                          ? `0 0 0 2px ${token.colorPrimary}33`
                          : 'none',
                      }}
                    >
                      <img
                        src={currentQuestion[opt]}
                        alt={opt}
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          userSelect: 'none',
                        }}
                      />
                    </div>
                    <Radio
                      value={opt}
                      style={{
                        width: '100%',
                        height: 32,
                        borderRadius: 8,
                        background: isSelected
                          ? token.colorPrimary
                          : '#2a2a2a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: 0,
                        padding: 0,
                        transition: 'background 0.2s',
                      }}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {opt}
                      </Text>
                    </Radio>
                  </div>
                )
              })}
            </Radio.Group>

            {locked && selectedOption === null && (
              <div style={{ textAlign: 'center' }}>
                <Text type="danger">时间到，即将进入下一题……</Text>
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* 结果页 */}
      {phase === 'result' && (
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
            status={isFI ? 'success' : 'info'}
            title={`测验完成：${totalScore} / ${QUESTIONS.length} 分`}
            subTitle={
              isFI ? '认知风格倾向：场独立型（FI）' : '认知风格倾向：场依存型（FD）'
            }
          >
            <Space
              size="large"
              wrap
              style={{ justifyContent: 'center', display: 'flex' }}
            >
              <Statistic title="总分" value={`${totalScore} / ${QUESTIONS.length}`} />
              <Statistic
                title="正确题数"
                value={totalScore}
                suffix={`/ ${QUESTIONS.length}`}
              />
              <Statistic
                title="平均正确反应时"
                value={avgRT !== null ? Math.round(avgRT) : '--'}
                suffix="ms"
              />
            </Space>
            <Paragraph type="secondary" style={{ marginTop: 24, textAlign: 'center' }}>
              得分 ≥ 7 判定为场独立型（FI）倾向；得分 &lt; 7 判定为场依存型（FD）倾向。
            </Paragraph>
          </Result>
        </Card>
      )}

      {/* 统一底部操作栏 */}
      {(phase === 'welcome' || phase === 'result') && (
        <div style={actionBarStyle}>
          {phase === 'welcome' ? (
            <Button type="primary" onClick={startTest}>
              开始测验
            </Button>
          ) : (
            <Button type="primary" onClick={handleComplete}>
              进入下一流程
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default Flow2EFT
