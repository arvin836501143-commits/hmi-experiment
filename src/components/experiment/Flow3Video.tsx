import { useRef, useState, useEffect } from 'react'
import { App, Typography, Spin } from 'antd'

const { Text } = Typography

interface Flow3VideoProps {
  onComplete: () => void
}

/**
 * 流程三：全屏播放道路行驶视频，出现 Toast 提示，
 * 视频结束后自动跳转下一流程。
 */
function Flow3Video({ onComplete }: Flow3VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { message } = App.useApp()
  const completedRef = useRef(false)

  // 视频加载完成后播放并弹出 Toast
  const handleLoadedData = () => {
    setLoading(false)
    const v = videoRef.current
    if (!v) return
    v.play().then(() => {
      message.info('请专心观看道路行驶视频，稍后会自动跳转下一流程', 4)
    }).catch(() => {
      // 自动播放被阻止，提示用户点击播放
      setLoading(false)
    })
  }

  // 视频结束 → 自动跳转
  const handleEnded = () => {
    if (completedRef.current) return
    completedRef.current = true
    message.success('视频观看完毕，即将进入下一流程...', 2)
    setTimeout(() => onComplete(), 1500)
  }

  const handleError = () => {
    setLoading(false)
    setError(true)
  }

  // 允许用户点击视频区域手动播放（应对自动播放限制）
  const handleVideoClick = () => {
    const v = videoRef.current
    if (v && v.paused) {
      v.play().catch(() => {})
    }
  }

  useEffect(() => {
    // StrictMode 下组件会 mount → unmount → mount，
    // 需要在每次 mount 时重置 completedRef，避免 cleanup 设置的 true 残留
    completedRef.current = false
    return () => {
      completedRef.current = true
    }
  }, [])

  return (
    <div
      style={{
        flex: 1,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
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
          cursor: 'pointer',
        }}
        onLoadedData={handleLoadedData}
        onEnded={handleEnded}
        onError={handleError}
        onClick={handleVideoClick}
        playsInline
        controls={false}
      />
    </div>
  )
}

export default Flow3Video
