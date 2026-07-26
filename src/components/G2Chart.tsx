import { useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'

interface G2ChartProps {
  /** G2 图表配置函数，接收 chart 实例进行渲染 */
  render: (chart: Chart) => void
  /** 容器高度，默认 320 */
  height?: number
}

/**
 * 通用 G2 图表容器组件。
 * 在 mount 时创建 Chart 实例并调用 render 回调，unmount 时销毁。
 */
function G2Chart({ render, height = 320 }: G2ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      height,
      paddingLeft: 50,
      paddingRight: 30,
      paddingTop: 50,
      paddingBottom: 60,
    })

    chart.theme({ type: 'classicDark' })
    chartRef.current = chart
    render(chart)
    chart.render()

    return () => {
      chart.destroy()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}

export default G2Chart
