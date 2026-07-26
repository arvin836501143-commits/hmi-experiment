/** 实验流程共享类型定义 */

/** 人口学与驾驶背景数据 */
export interface DemographicData {
  age: number | null;
  gender: 'male' | 'female' | null;
  education: string;
  occupation: string;
  hasLicense: 'yes' | 'no' | null;
  drivingYears: string;
  annualMileage: string;
  visionStatus: string;
  colorBlindTest1: string; // '74' | '21' | 'none'
  colorBlindTest2: string; // 'circle' | 'triangle' | 'none'
}

/** 镶嵌图形测验单题结果 */
export interface EFTQuestionResult {
  questionIndex: number;
  selectedOption: string | null; // 'A' | 'B' | 'C' | 'D' | null(超时)
  isCorrect: boolean;
  responseTime: number | null; // ms，超时为 null
}

/** 镶嵌图形测验总结果 */
export interface EFTResult {
  results: EFTQuestionResult[];
  totalScore: number;
  avgCorrectResponseTime: number | null;
}

/** HMI 布局类型 */
export type HMILayout = 'sr-led' | 'nav-led' | 'balanced';

/** 拉丁方序列（3×3 平衡拉丁方设计） */
export const LATIN_SQUARE_SEQUENCES: HMILayout[][] = [
  ['sr-led', 'nav-led', 'balanced'], // 序列1: SR → Nav → Balanced
  ['nav-led', 'balanced', 'sr-led'], // 序列2: Nav → Balanced → SR
  ['balanced', 'sr-led', 'nav-led'], // 序列3: Balanced → SR → Nav
];

/** 流程四：接管绩效测试单次试次结果 */
export interface TakeoverTrialResult {
  layout: HMILayout;
  reactionTime: number; // ms，从 HMI 出现到点击热区的时间
  hit: boolean; // 是否命中热区
}

/** 流程四：接管绩效测试总结果 */
export interface TakeoverResult {
  sequence: HMILayout[]; // 实际呈现顺序
  trials: TakeoverTrialResult[];
}

/** NASA-TLX 维度 */
export type TLXDimension =
  | 'mentalDemand'
  | 'physicalDemand'
  | 'temporalDemand'
  | 'performance'
  | 'effort'
  | 'frustration';

/** 流程五：单个布局的主观调研结果 */
export interface SurveyLayoutResult {
  layout: HMILayout;
  ratings: Record<TLXDimension, number>; // 0-100
}

/** 流程五：主观调研总结果 */
export interface SurveyResult {
  sequence: HMILayout[];
  results: SurveyLayoutResult[];
}

/** 实验阶段 */
export type ExperimentPhase =
  | 'screening'
  | 'eft'
  | 'takeover'
  | 'survey'
  | 'complete'
  | 'disqualified';

/** 不合格原因 */
export type DisqualifyReason =
  | 'no_license'
  | 'color_blind_1'
  | 'color_blind_2'
  | null;

/** 初始人口学数据 */
export const initialDemographicData: DemographicData = {
  age: null,
  gender: null,
  education: '',
  occupation: '',
  hasLicense: null,
  drivingYears: '',
  annualMileage: '',
  visionStatus: '',
  colorBlindTest1: '',
  colorBlindTest2: '',
};

/**
 * 完整实验数据汇总（一位被试的完整数据包）
 * 用于在实验结束时统一收集、提交后端。
 */
export interface ExperimentRecord {
  /** 实验时间戳（ISO 字符串） */
  timestamp: string;
  /** 流程一：人口学与驾驶背景数据 */
  demographic: DemographicData | null;
  /** 流程二：镶嵌图形测验结果 */
  eft: EFTResult | null;
  /** 流程三：接管绩效测试结果 */
  takeover: TakeoverResult | null;
  /** 流程四：主观调研结果 */
  survey: SurveyResult | null;
}
