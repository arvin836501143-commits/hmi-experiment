import { useRef, useState, useEffect, type ReactNode } from 'react'
import { COCKPIT_SCREEN_PCT } from '../../config/hmi'

/**
 * 座舱样机容器
 *
 * 以 16:9 等比例渲染座舱样机背景图，并在红色中控屏区域内
 * 嵌入子内容（HMI 界面）。中控屏容器带圆角（16px @1倍稿）。
 *
 * 当窗口宽高比 ≠ 16:9 时，背景图使用 object-fit: contain 居中，
 * 内部中控屏容器按背景图实际渲染区域百分比定位。
 */
interface CockpitContainerProps {
  /** 中控屏内嵌入的内容 */
  children?: ReactNode
  /** 是否显示中控屏容器（默认 true） */
  showScreen?: boolean
  /** 额外覆盖在中控屏上的内容（如热区） */
  overlay?: ReactNode
}

export default function CockpitContainer({
  children,
  showScreen = true,
  overlay,
}: CockpitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgRect, setImgRect] = useState({ left: 0, top: 0, width: 0, height: 0 })

  useEffect(() => {
    const updateRect = () => {
      const el = containerRef.current
      if (!el) return
      const cw = el.clientWidth
      const ch = el.clientHeight
      const containerRatio = cw / ch
      const imgRatio = 16 / 9

      let renderedW: number, renderedH: number, offsetX: number, offsetY: number

      if (containerRatio > imgRatio) {
        // 容器更宽 → 图片高度铺满，左右留白
        renderedH = ch
        renderedW = ch * imgRatio
        offsetX = (cw - renderedW) / 2
        offsetY = 0
      } else {
        // 容器更高 → 图片宽度铺满，上下留白
        renderedW = cw
        renderedH = cw / imgRatio
        offsetX = 0
        offsetY = (ch - renderedH) / 2
      }

      setImgRect({ left: offsetX, top: offsetY, width: renderedW, height: renderedH })
    }

    updateRect()
    const ro = new ResizeObserver(updateRect)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // 计算圆角缩放比例：实际渲染宽度 / 1920
  const scale = imgRect.width / 1920
  const borderRadius = COCKPIT_SCREEN_PCT.borderRadius * scale

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {/* 座舱背景图 */}
      <img
        src="/hmi/cockpit-prototype.jpg"
        alt="座舱样机"
        style={{
          position: 'absolute',
          left: imgRect.left,
          top: imgRect.top,
          width: imgRect.width,
          height: imgRect.height,
          objectFit: 'fill',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />

      {/* 中控屏容器 */}
      {showScreen && (
        <div
          style={{
            position: 'absolute',
            left: imgRect.left + (imgRect.width * COCKPIT_SCREEN_PCT.left) / 100,
            top: imgRect.top + (imgRect.height * COCKPIT_SCREEN_PCT.top) / 100,
            width: (imgRect.width * COCKPIT_SCREEN_PCT.width) / 100,
            height: (imgRect.height * COCKPIT_SCREEN_PCT.height) / 100,
            borderRadius: borderRadius,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          {children}
          {overlay}
        </div>
      )}
    </div>
  )
}
