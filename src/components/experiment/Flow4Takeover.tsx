import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, Card, Result, Space, Spin, Statistic, Tag, Typography } from 'antd'
import { ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { App } from 'antd'
import CockpitContainer from './CockpitContainer'
import {
  TAKEOVER_HMI_CONFIG,
  LAYOUT_LABELS,
  hotspotToPercent,
} from '../../config/hmi'
import {
  LATIN_SQUARE_SEQUENCES,
  type HMILayout,
  type TakeoverResult,
  type TakeoverTrialResult,
} from '../../types/experiment'

const { Title, Paragraph, Text } = Typography

interface Flow4TakeoverProps {
  onComplete: (result: TakeoverResult) => void
}

type Phase = 'instruction' | 'video' | 'countdown' | 'waiting' | 'trial' | 'feedback' | 'result'

/** 倒计时每个数字持续时长（毫秒） */
const COUNTDOWN_STEP = 1000
/** 反馈阶段持续时长（毫秒） */
const FEEDBACK_DURATION = 800
/** 报警声参数：800Hz、300ms */
const BEEP_FREQUENCY = 800
const BEEP_DURATION = 0.3 // 秒
const BEEP_VOLUME = 0.3

/** 沉浸式全屏容器（倒计时 / 反馈） */
const immersiveWrapStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: '#000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/** 测试阶段全屏容器 */
const trialWrapStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: '#000',
}

/**
 * 流程四：L3 级自动驾驶接管绩效测试
 *
 * 被试在座舱样机中看到 HMI 界面（伴随报警声）后，以最快速度点击红色危险车辆。
 * 采用 3×3 平衡拉丁方设计，每位被试完成 3 轮（3 种 HMI 布局各一次）。
 * 记录每轮的反应时与命中情况。
 *
 * 命中判定：HMI 出现后首次点击落在不可见热区上计为「命中」，落在 HMI 其他区域
 * 计为「未命中」；无论命中与否，首次点击即结束当前试次。
 */
function Flow4Takeover({ onComplete }: Flow4TakeoverProps) {
  const { message } = App.useApp()
  const [phase, setPhase] = useState<Phase>('instruction')
  // 挂载时随机选择一个拉丁方序列，平衡布局呈现顺序
  const [sequence] = useState<HMILayout[]>(() => {
    const idx = Math.floor(Math.random() * LATIN_SQUARE_SEQUENCES.length)
    return LATIN_SQUARE_SEQUENCES[idx]
  })
  const [trialIndex, setTrialIndex] = useState(0)
  const [trials, setTrials] = useState<TakeoverTrialResult[]>([])
  const [countdownNum, setCountdownNum] = useState(3)
  const [lastReactionTime, setLastReactionTime] = useState<number | null>(null)
  const [lastHit, setLastHit] = useState(false)
  /** 当前试次 HMI 图片是否已加载完成 */
  const [imageLoaded, setImageLoaded] = useState(false)

  const startTimeRef = useRef(0)
  const answeredRef = useRef(false)
  /** 图片加载完成标志（ref 版本，供异步回调同步读取） */
  const imageLoadedRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** 当前试次的布局与热区（百分比定位） */
  const currentLayout = sequence[trialIndex]
  const currentConfig = TAKEOVER_HMI_CONFIG[currentLayout]
  const hotspotPct = hotspotToPercent(currentConfig.hotspot)

  /** 清理所有定时器 */
  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
  }, [])

  /** 生成短促报警声（Web Audio API，800Hz / 300ms） */
  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        if (!AudioCtx) return
        audioCtxRef.current = new AudioCtx()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = BEEP_FREQUENCY
      // 保持音量，末尾短淡出，避免爆音
      gain.gain.setValueAtTime(BEEP_VOLUME, ctx.currentTime)
      gain.gain.setValueAtTime(BEEP_VOLUME, ctx.currentTime + BEEP_DURATION - 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + BEEP_DURATION)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + BEEP_DURATION)
    } catch {
      // 音频不可用时静默失败，不阻断测试流程
    }
  }, [])

  /**
   * 预加载所有图片资源（座舱样机背景 + 全部 HMI 设计稿），
   * 确保试次开始时图片已缓存，保证计时准确。
   */
  useEffect(() => {
    const imgs: HTMLImageElement[] = []
    // 座舱样机背景图
    const cockpit = new Image()
    cockpit.src = '/hmi/cockpit-prototype.jpg'
    imgs.push(cockpit)
    // 全部 HMI 设计稿
    Object.values(TAKEOVER_HMI_CONFIG).forEach((cfg) => {
      const img = new Image()
      img.src = cfg.image
      imgs.push(img)
    })
    return () => {
      imgs.length = 0
    }
  }, [])

  /**
   * 倒计时阶段：3 → 2 → 1 → 进入 trial
   *
   * 倒计时期间 CockpitContainer 与 HMI 图片已在隐藏状态下渲染，
   * 图片加载与布局计算同步进行。倒计时结束后：
   * - 图片已加载 → 立即进入 trial
   * - 图片未加载 → 进入 waiting 阶段等待加载完成
   */
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownNum(3)
    let count = 3
    countdownIntervalRef.current = setInterval(() => {
      count -= 1
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        setPhase(imageLoadedRef.current ? 'trial' : 'waiting')
      } else {
        setCountdownNum(count)
      }
    }, COUNTDOWN_STEP)
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [phase])

  /** 等待阶段：倒计时结束但图片尚未加载完成，显示加载指示器 */
  useEffect(() => {
    if (phase !== 'waiting') return
    if (imageLoadedRef.current) {
      setPhase('trial')
      return
    }
    // 安全兜底：超过 8 秒仍未加载则强制进入试次，避免卡死
    const fallback = setTimeout(() => {
      setPhase('trial')
    }, 8000)
    return () => clearTimeout(fallback)
  }, [phase, imageLoaded])

  /** 测试阶段：HMI 出现瞬间记录起始时间并播放报警声 */
  useEffect(() => {
    if (phase !== 'trial') return
    answeredRef.current = false
    startTimeRef.current = performance.now()
    playBeep()
  }, [phase, trialIndex, playBeep])

  /** 反馈阶段：显示反应时，持续 800ms 后进入下一试次或结果页 */
  useEffect(() => {
    if (phase !== 'feedback') return
    feedbackTimerRef.current = setTimeout(() => {
      feedbackTimerRef.current = null
      if (trialIndex >= sequence.length - 1) {
        setPhase('result')
      } else {
        imageLoadedRef.current = false
        setImageLoaded(false)
        setTrialIndex((i) => i + 1)
        setPhase('countdown')
      }
    }, FEEDBACK_DURATION)
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
        feedbackTimerRef.current = null
      }
    }
  }, [phase, trialIndex, sequence.length])

  /** 组件卸载：清理定时器与音频资源，避免内存泄漏 */
  useEffect(() => {
    return () => {
      clearTimers()
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [clearTimers])

  /** HMI 图片加载完成回调 */
  const handleImageLoad = useCallback(() => {
    imageLoadedRef.current = true
    setImageLoaded(true)
  }, [])

  /** HMI 图片加载失败回调（同样标记为已加载，避免卡在 waiting 阶段） */
  const handleImageError = useCallback(() => {
    imageLoadedRef.current = true
    setImageLoaded(true)
  }, [])

  /** 结束当前试次：记录反应时与命中情况，进入反馈 */
  const handleTrialEnd = (hit: boolean) => {
    if (answeredRef.current) return
    answeredRef.current = true
    const reactionTime = performance.now() - startTimeRef.current
    const trialResult: TakeoverTrialResult = {
      layout: sequence[trialIndex],
      reactionTime,
      hit,
    }
    setTrials((prev) => [...prev, trialResult])
    setLastReactionTime(reactionTime)
    setLastHit(hit)
    setPhase('feedback')
  }

  const handleStart = () => {
    setTrials([])
    setTrialIndex(0)
    setPhase('video')
  }

  /** 视频播放结束后自动进入倒计时阶段，并重置图片加载状态 */
  const handleVideoEnd = useCallback(() => {
    imageLoadedRef.current = false
    setImageLoaded(false)
    setPhase('countdown')
  }, [])

  const handleComplete = () => {
    const result: TakeoverResult = { sequence, trials }
    onComplete(result)
  }

  // 结果页统计
  const avgRT =
    trials.length > 0
      ? Math.round(trials.reduce((s, t) => s + t.reactionTime, 0) / trials.length)
      : 0
  const hitCount = trials.filter((t) => t.hit).length

  return (
    <>
      {/* 指导语 */}
      {phase === 'instruction' && (
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
              icon={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
              title="L3 级自动驾驶接管绩效测试"
              subTitle="评估您在 L3 级自动驾驶接管场景中的反应速度与准确性"
            >
              <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'left' }}>
                <Paragraph>
                  在 L3 级自动驾驶中，当系统达到运行范围边界或遇到紧急情况时，会向驾驶员发出
                  <Text strong> 接管请求</Text>。本测试模拟该场景：座舱 HMI 界面会突然出现，并伴随
                  <Text strong> 报警声</Text>，提示前方存在危险。
                </Paragraph>
                <Paragraph>
                  请您在看到 HMI 界面中的
                  <Text type="danger" strong> 红色危险车辆 </Text>
                  后，<Text strong>以最快速度点击它</Text>。
                </Paragraph>
                <Paragraph style={{ marginBottom: 4 }}>测试说明：</Paragraph>
                <ul style={{ marginTop: 4, marginBottom: 0 }}>
                  <li>点击「开始」后，将首先播放一段 <Text strong>10 秒的驾驶视频</Text>，请专心观看，帮助您熟悉自动驾驶场景。</li>
                  <li>视频结束后，将自动进入接管测试，共 <Text strong>3 轮</Text>，每轮呈现不同的 HMI 布局。</li>
                  <li>每轮开始前有 <Text strong>3-2-1</Text> 倒计时，请保持专注。</li>
                  <li>系统将记录从 HMI 出现到您点击红色车辆的反应时间。</li>
                  <li>测试阶段为全屏沉浸式，请勿中途离开页面。</li>
                </ul>
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
            <Button type="primary" onClick={handleStart}>开始测试</Button>
          </div>
        </div>
      )}

      {/* 视频观看 */}
      {phase === 'video' && (
        <VideoPlayer onEnded={handleVideoEnd} messageApi={message} />
      )}

      {/* 倒计时 + 等待 + 正式测试：倒计时/等待期间隐藏渲染 CockpitContainer 进行预加载 */}
      {(phase === 'countdown' || phase === 'waiting' || phase === 'trial') && (
        <div style={trialWrapStyle}>
          {/* 座舱样机 + HMI 界面（倒计时/等待期间隐藏，仅预加载） */}
          <div
            style={{
              width: '100%',
              height: '100%',
              visibility: phase === 'trial' ? 'visible' : 'hidden',
            }}
          >
            <CockpitContainer
              overlay={
                <>
                  {/* 失误捕获层：覆盖整个中控屏，点击即视为未命中红色车辆 */}
                  <div
                    onClick={() => phase === 'trial' && handleTrialEnd(false)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 1,
                      background: 'transparent',
                      cursor: 'default',
                    }}
                  />
                  {/* 不可见热区：覆盖红色车辆，点击视为命中 */}
                  <div
                    onClick={() => phase === 'trial' && handleTrialEnd(true)}
                    style={{
                      position: 'absolute',
                      left: `${hotspotPct.left}%`,
                      top: `${hotspotPct.top}%`,
                      width: `${hotspotPct.width}%`,
                      height: `${hotspotPct.height}%`,
                      zIndex: 2,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'default',
                    }}
                  />
                </>
              }
            >
              <img
                src={currentConfig.image}
                alt="HMI 界面"
                draggable={false}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  display: 'block',
                  userSelect: 'none',
                }}
              />
            </CockpitContainer>
          </div>

          {/* 倒计时数字遮罩 */}
          {phase === 'countdown' && (
            <div style={{ ...immersiveWrapStyle, zIndex: 10 }}>
              <Title
                level={1}
                style={{ color: '#fff', fontSize: 180, lineHeight: 1, margin: 0 }}
              >
                {countdownNum}
              </Title>
            </div>
          )}

          {/* 加载等待遮罩 */}
          {phase === 'waiting' && (
            <div
              style={{
                ...immersiveWrapStyle,
                zIndex: 10,
                flexDirection: 'column',
              }}
            >
              <Spin size="large" />
              <Text
                style={{
                  color: 'rgba(255,255,255,0.65)',
                  marginTop: 16,
                  fontSize: 16,
                }}
              >
                正在加载测试界面...
              </Text>
            </div>
          )}

          {/* 试次编号（不拦截点击） */}
          {phase === 'trial' && (
            <div
              style={{
                position: 'absolute',
                top: 24,
                right: 32,
                zIndex: 10,
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 18,
                pointerEvents: 'none',
              }}
            >
              第 {trialIndex + 1} / {sequence.length} 轮
            </div>
          )}
        </div>
      )}

      {/* 反馈 */}
      {phase === 'feedback' && (
        <div style={immersiveWrapStyle}>
          <Space direction="vertical" align="center" size={12}>
            <Title
              level={1}
              style={{
                color: lastHit ? '#52c41a' : '#ff4d4f',
                margin: 0,
                fontSize: 96,
              }}
            >
              {Math.round(lastReactionTime ?? 0)} ms
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18 }}>
              {lastHit ? '命中红色车辆' : '未命中'}
            </Text>
          </Space>
        </div>
      )}

      {/* 结果 */}
      {phase === 'result' && (
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
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="接管绩效测试完成"
              subTitle={`已完成 ${trials.length} 轮测试`}
            >
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <Space
                  size="large"
                  wrap
                  style={{ justifyContent: 'center', display: 'flex', marginBottom: 24 }}
                >
                  {trials.map((t, i) => (
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
                      valueStyle={{ color: t.hit ? '#1677ff' : '#ff4d4f' }}
                    />
                  ))}
                </Space>
                <Space size="large" style={{ justifyContent: 'center', display: 'flex' }}>
                  <Statistic title="平均反应时" value={avgRT} suffix="ms" />
                  <Statistic title="命中数" value={hitCount} suffix={`/ ${trials.length}`} />
                </Space>
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
            <Button type="primary" onClick={handleComplete}>进入下一流程</Button>
          </div>
        </div>
      )}
    </>
  )
}

/** 视频播放子组件：全屏播放 10 秒驾驶视频 */
function VideoPlayer({
  onEnded,
  messageApi,
}: {
  onEnded: () => void
  messageApi: ReturnType<typeof App.useApp>['message']
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const completedRef = useRef(false)

  const handleLoadedData = () => {
    setLoading(false)
    const v = videoRef.current
    if (!v) return
    v.play().then(() => {
      messageApi.info('请专心观看道路行驶视频，稍后将自动进入接管测试', 4)
    }).catch(() => {
      setLoading(false)
    })
  }

  const handleEnded = () => {
    if (completedRef.current) return
    completedRef.current = true
    messageApi.success('视频观看完毕，即将开始接管测试...', 2)
    setTimeout(() => onEnded(), 1500)
  }

  const handleError = () => {
    setError(true)
    setLoading(false)
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading && !error && (
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: '#ccc' }}>正在加载视频...</Text>
          </div>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#ff4d4f', display: 'block', marginBottom: 16 }}>
            视频加载失败，请检查网络或刷新页面重试
          </Text>
        </div>
      )}

      <video
        ref={videoRef}
        src="/videos/driving.mp4"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: loading || error ? 'none' : 'block',
        }}
        onLoadedData={handleLoadedData}
        onEnded={handleEnded}
        onError={handleError}
        playsInline
        controls={false}
      />
    </div>
  )
}

export default Flow4Takeover
