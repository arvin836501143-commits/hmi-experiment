import { useEffect, useRef } from 'react'

interface IshiharaPlateProps {
  /** 'number' 渲染数字74, 'shape' 渲染圆形 */
  type: 'number' | 'shape'
  size?: number
}

/**
 * 基于 Canvas 的 Ishihara 风格色盲检查图组件。
 * 目标图形(数字/形状)使用暖色系(红/橙)，背景使用冷色系(绿/黄绿)，
 * 正常视觉者可辨识目标，红绿色盲者无法区分。
 */
function IshiharaPlate({ type, size = 300 }: IshiharaPlateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = size
    const H = size

    // 1. 离屏 canvas 绘制目标图形用于像素采样
    const off = document.createElement('canvas')
    off.width = W
    off.height = H
    const offCtx = off.getContext('2d')!
    offCtx.fillStyle = '#000'
    offCtx.fillRect(0, 0, W, H)
    offCtx.fillStyle = '#fff'

    if (type === 'number') {
      offCtx.font = `bold ${Math.floor(W * 0.45)}px Arial, sans-serif`
      offCtx.textAlign = 'center'
      offCtx.textBaseline = 'middle'
      offCtx.fillText('74', W / 2, H / 2)
    } else {
      offCtx.beginPath()
      offCtx.arc(W / 2, H / 2, W * 0.28, 0, Math.PI * 2)
      offCtx.fill()
    }

    const imgData = offCtx.getImageData(0, 0, W, H).data

    // 2. 主 canvas 绘制底色
    ctx.fillStyle = '#E8E8E0'
    ctx.fillRect(0, 0, W, H)

    // 3. 裁剪为圆形板
    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2)
    ctx.clip()

    // 4. 色板定义
    const figureColors = [
      '#C0392B', '#E74C3C', '#D35400', '#E67E22',
      '#A93226', '#CB4335', '#BA4A00', '#D9480F',
    ]
    const groundColors = [
      '#27AE60', '#2ECC71', '#58D68D', '#82E0AA',
      '#229954', '#28B463', '#1E8449', '#52BE80',
    ]

    // 5. 随机散点填充
    const spacing = 7
    for (let y = 0; y < H; y += spacing) {
      for (let x = 0; x < W; x += spacing) {
        const jx = x + (Math.random() - 0.5) * 4
        const jy = y + (Math.random() - 0.5) * 4
        const sx = Math.max(0, Math.min(W - 1, Math.floor(jx)))
        const sy = Math.max(0, Math.min(H - 1, Math.floor(jy)))
        const idx = (sy * W + sx) * 4
        const isFigure = imgData[idx] > 128

        const r = 3 + Math.random() * 4
        const palette = isFigure ? figureColors : groundColors
        ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]
        ctx.beginPath()
        ctx.arc(jx, jy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }, [type, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: '50%', display: 'block' }}
    />
  )
}

export default IshiharaPlate
