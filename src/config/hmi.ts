import type { HMILayout } from '../types/experiment'

/**
 * HMI 布局配置
 *
 * 所有坐标基于 1920×1080 设计稿（1倍稿）。
 * 实际图片为 3840×2160（2倍稿），百分比换算后自适应。
 */

/** 座舱样机中控屏（红色区域）位置与尺寸
 *
 * 坐标通过全分辨率像素扫描座舱样机图（3840×2160）中的 #4d0000 红色区域得到，
 * 在实际扫描边界基础上向四周扩展 4px（@1920），确保 HMI 图片完全覆盖红色背景，
 * 消除 1-2px 红边漏出问题。
 */
const SCREEN_INSET = 4 /** 向外扩展像素（@1920），消除红色边缘漏出 */

export const COCKPIT_SCREEN = {
  /** 中控屏左上角 X（px @1920） */
  left: 766 - SCREEN_INSET,
  /** 中控屏左上角 Y（px @1920） */
  top: 272 - SCREEN_INSET,
  /** 中控屏宽度（px @1920） */
  width: 800 + SCREEN_INSET * 2,
  /** 中控屏高度（px @1920） */
  height: 451 + SCREEN_INSET * 2,
  /** 圆角半径（px @1920） */
  borderRadius: 16,
}

/** 转换为百分比（相对 1920×1080） */
export const COCKPIT_SCREEN_PCT = {
  left: (COCKPIT_SCREEN.left / 1920) * 100,
  top: (COCKPIT_SCREEN.top / 1080) * 100,
  width: (COCKPIT_SCREEN.width / 1920) * 100,
  height: (COCKPIT_SCREEN.height / 1080) * 100,
  borderRadius: COCKPIT_SCREEN.borderRadius,
}

/**
 * 红色车辆交互热区配置
 *
 * 每个布局的热区坐标基于 1920×1080 设计稿，
 * 已包含向外 10px 间距。
 */
export interface HotspotConfig {
  /** 热区左上角 X（px @1920） */
  x: number
  /** 热区左上角 Y（px @1920） */
  y: number
  /** 热区宽度（px @1920） */
  width: number
  /** 热区高度（px @1920） */
  height: number
}

/** 流程四（接管绩效测试）HMI 配置 */
export const TAKEOVER_HMI_CONFIG: Record<HMILayout, { image: string; hotspot: HotspotConfig }> = {
  'sr-led': {
    image: '/hmi/takeover/sr-led.jpg',
    // 红车检测区域 (597,366)-(679,423) + 10px 外扩
    hotspot: { x: 587, y: 356, width: 102, height: 77 },
  },
  'nav-led': {
    image: '/hmi/takeover/nav-led.jpg',
    // 红车检测区域 (1557,366)-(1639,423) + 10px 外扩
    hotspot: { x: 1547, y: 356, width: 102, height: 77 },
  },
  balanced: {
    image: '/hmi/takeover/balanced.jpg',
    // 红车检测区域 (437,366)-(519,423) + 10px 外扩
    hotspot: { x: 427, y: 356, width: 102, height: 77 },
  },
}

/** 流程五（主观调研）HMI 配置（无热区） */
export const SURVEY_HMI_CONFIG: Record<HMILayout, { image: string }> = {
  'sr-led': { image: '/hmi/survey/sr-led.jpg' },
  'nav-led': { image: '/hmi/survey/nav-led.jpg' },
  balanced: { image: '/hmi/survey/balanced.jpg' },
}

/** 布局中文名称 */
export const LAYOUT_LABELS: Record<HMILayout, string> = {
  'sr-led': 'SR 主导布局',
  'nav-led': '导航主导布局',
  balanced: '均衡布局',
}

/**
 * 将 1920×1080 坐标系下的热区转换为百分比。
 * 用于在缩放后的 HMI 图片上定位热区。
 */
export function hotspotToPercent(hs: HotspotConfig) {
  return {
    left: (hs.x / 1920) * 100,
    top: (hs.y / 1080) * 100,
    width: (hs.width / 1920) * 100,
    height: (hs.height / 1080) * 100,
  }
}
