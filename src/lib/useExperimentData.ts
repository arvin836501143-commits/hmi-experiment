import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type {
  DemographicData,
  EFTResult,
  TakeoverResult,
  SurveyResult,
} from '../types/experiment'

/** Supabase experiment_records 表行结构 */
export interface ExperimentRecordRow {
  id: number
  created_at: string
  timestamp: string | null
  demographic: DemographicData | null
  eft: EFTResult | null
  takeover: TakeoverResult | null
  survey: SurveyResult | null
  disqualify_reason: string | null
}

/** 三种 HMI 布局的中文标签 */
export const LAYOUT_LABELS_MAP: Record<string, string> = {
  'sr-led': 'SR主导布局',
  'nav-led': '导航主导布局',
  balanced: '均衡布局',
}

/** 从 Supabase 拉取全部实验记录 */
export function useExperimentData() {
  const [records, setRecords] = useState<ExperimentRecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setLoading(true)
      const { data, error } = await supabase
        .from('experiment_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setError(error.message)
        setRecords([])
      } else {
        setRecords((data ?? []) as ExperimentRecordRow[])
        setError(null)
      }
      setLoading(false)
    }

    fetchAll()
    return () => {
      cancelled = true
    }
  }, [])

  return { records, loading, error }
}
