import { useMemo } from 'react'
import {
  Card,
  Tabs,
  Typography,
  Table,
  Statistic,
  Row,
  Col,
  Empty,
  Spin,
  Alert,
  Space,
} from 'antd'
import G2Chart from '../components/G2Chart'
import { useExperimentData, LAYOUT_LABELS_MAP } from '../lib/useExperimentData'
import type { Chart } from '@antv/g2'

const { Title } = Typography

/** 不合格原因 → 中文 */
const DISQUALIFY_LABELS: Record<string, string> = {
  no_license: '无驾驶证',
  color_blind_1: '色盲测试1未通过',
  color_blind_2: '色盲测试2未通过',
}

/** TLX 六维度中文 */
const TLX_LABELS: Record<string, string> = {
  mentalDemand: '脑力要求',
  physicalDemand: '体力要求',
  temporalDemand: '时间要求',
  performance: '作业绩效',
  effort: '努力程度',
  frustration: '挫败感',
}

/** 性别 → 中文 */
function genderText(v: string | null) {
  if (v === 'male') return '男'
  if (v === 'female') return '女'
  return '-'
}

/** 是否 → 中文 */
function yesNoText(v: string | null) {
  if (v === 'yes') return '是'
  if (v === 'no') return '否'
  return '-'
}

/** 布局 → 中文 */
function layoutText(v: string) {
  return LAYOUT_LABELS_MAP[v] ?? v
}

function Analysis() {
  const { records, loading, error } = useExperimentData()

  // -------- 统计派生数据 --------
  const stats = useMemo(() => {
    const total = records.length
    const disqualified = records.filter((r) => r.disqualify_reason).length
    const completed = records.filter(
      (r) => r.eft && r.takeover && r.survey,
    ).length

    const eftRecords = records.filter((r) => r.eft)
    const avgEftScore =
      eftRecords.length > 0
        ? eftRecords.reduce((s, r) => s + (r.eft!.totalScore || 0), 0) /
          eftRecords.length
        : 0

    const eftRts = eftRecords
      .filter((r) => r.eft!.avgCorrectResponseTime !== null)
      .map((r) => r.eft!.avgCorrectResponseTime!)
    const avgEftRt =
      eftRts.length > 0 ? eftRts.reduce((s, v) => s + v, 0) / eftRts.length : 0

    const takeoverByLayout: Record<string, number[]> = {}
    records.forEach((r) => {
      r.takeover?.trials.forEach((t) => {
        if (!takeoverByLayout[t.layout]) takeoverByLayout[t.layout] = []
        takeoverByLayout[t.layout].push(t.reactionTime)
      })
    })

    const hitRateByLayout: Record<string, { hit: number; total: number }> = {}
    records.forEach((r) => {
      r.takeover?.trials.forEach((t) => {
        if (!hitRateByLayout[t.layout]) hitRateByLayout[t.layout] = { hit: 0, total: 0 }
        hitRateByLayout[t.layout].total++
        if (t.hit) hitRateByLayout[t.layout].hit++
      })
    })

    const tlxByLayout: Record<string, Record<string, number[]>> = {}
    records.forEach((r) => {
      r.survey?.results.forEach((sr) => {
        if (!tlxByLayout[sr.layout]) tlxByLayout[sr.layout] = {}
        Object.entries(sr.ratings).forEach(([dim, val]) => {
          if (!tlxByLayout[sr.layout][dim]) tlxByLayout[sr.layout][dim] = []
          tlxByLayout[sr.layout][dim].push(val)
        })
      })
    })

    const genderCount = { male: 0, female: 0 }
    const ageList: number[] = []
    records.forEach((r) => {
      if (r.demographic) {
        if (r.demographic.gender === 'male') genderCount.male++
        else if (r.demographic.gender === 'female') genderCount.female++
        if (r.demographic.age) ageList.push(r.demographic.age)
      }
    })
    const avgAge =
      ageList.length > 0 ? ageList.reduce((s, v) => s + v, 0) / ageList.length : 0

    return {
      total,
      disqualified,
      completed,
      avgEftScore,
      avgEftRt,
      takeoverByLayout,
      hitRateByLayout,
      tlxByLayout,
      genderCount,
      avgAge,
    }
  }, [records])

  // -------- 图表数据 --------
  const takeoverChartData = useMemo(() => {
    return Object.entries(stats.takeoverByLayout).map(([layout, rts]) => ({
      layout: LAYOUT_LABELS_MAP[layout] ?? layout,
      avgRt: Math.round(rts.reduce((s, v) => s + v, 0) / rts.length),
    }))
  }, [stats])

  const hitRateChartData = useMemo(() => {
    return Object.entries(stats.hitRateByLayout).map(([layout, v]) => ({
      layout: LAYOUT_LABELS_MAP[layout] ?? layout,
      hitRate: Math.round((v.hit / v.total) * 1000) / 10,
    }))
  }, [stats])

  const tlxChartData = useMemo(() => {
    const result: { layout: string; dimension: string; score: number }[] = []
    Object.entries(stats.tlxByLayout).forEach(([layout, dims]) => {
      Object.entries(dims).forEach(([dim, values]) => {
        result.push({
          layout: LAYOUT_LABELS_MAP[layout] ?? layout,
          dimension: TLX_LABELS[dim] ?? dim,
          score: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
        })
      })
    })
    return result
  }, [stats])

  const eftScoreChartData = useMemo(() => {
    return records
      .filter((r) => r.eft)
      .map((r, i) => ({
        subject: `被试${i + 1}`,
        score: r.eft!.totalScore,
        style: r.eft!.totalScore >= 7 ? '场独立型' : '场依存型',
      }))
  }, [records])

  // -------- 数据明细：展开为四个子表 --------
  // 表1：流程一 信息采集（每位被试一行）
  const screeningRows = useMemo(() => {
    return records.map((r, i) => ({
      key: `${r.id}-screen`,
      编号: i + 1,
      提交时间: new Date(r.created_at).toLocaleString('zh-CN'),
      年龄: r.demographic?.age ?? '-',
      性别: genderText(r.demographic?.gender ?? null),
      最高学历: r.demographic?.education || '-',
      职业类别: r.demographic?.occupation || '-',
      是否有驾驶证: yesNoText(r.demographic?.hasLicense ?? null),
      驾龄: r.demographic?.drivingYears || '-',
      年均行驶里程: r.demographic?.annualMileage || '-',
      视力状况: r.demographic?.visionStatus || '-',
      色盲测试1答案: r.demographic?.colorBlindTest1 || '-',
      色盲测试2答案: r.demographic?.colorBlindTest2 || '-',
      状态: r.disqualify_reason
        ? DISQUALIFY_LABELS[r.disqualify_reason] ?? '不合格'
        : r.eft && r.takeover && r.survey
          ? '已完成'
          : '进行中',
    }))
  }, [records])

  // 表2：流程二 图形测验逐题明细（每道题一行）
  const eftRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    records.forEach((r, ri) => {
      r.eft?.results.forEach((q) => {
        rows.push({
          key: `${r.id}-eft-${q.questionIndex}`,
          被试编号: ri + 1,
          提交时间: new Date(r.created_at).toLocaleString('zh-CN'),
          题号: q.questionIndex + 1,
          选择的选项: q.selectedOption ?? '超时未答',
          是否答对: q.isCorrect ? '正确' : '错误',
          答题时间: q.responseTime !== null ? `${Math.round(q.responseTime)} ms` : '超时',
        })
      })
    })
    return rows
  }, [records])

  // 表3：流程三 接管测试逐次明细（每次点击一行）
  const takeoverRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    records.forEach((r, ri) => {
      r.takeover?.trials.forEach((t, ti) => {
        rows.push({
          key: `${r.id}-takeover-${ti}`,
          被试编号: ri + 1,
          提交时间: new Date(r.created_at).toLocaleString('zh-CN'),
          试次序号: ti + 1,
          HMI布局: layoutText(t.layout),
          是否命中: t.hit ? '命中' : '未命中',
          点击反应时间: `${Math.round(t.reactionTime)} ms`,
        })
      })
    })
    return rows
  }, [records])

  // 表4：流程四 主观调研逐题明细（每个布局每个维度一行）
  const surveyRows = useMemo(() => {
    const rows: Record<string, unknown>[] = []
    records.forEach((r, ri) => {
      r.survey?.results.forEach((sr) => {
        Object.entries(sr.ratings).forEach(([dim, val]) => {
          rows.push({
            key: `${r.id}-survey-${sr.layout}-${dim}`,
            被试编号: ri + 1,
            提交时间: new Date(r.created_at).toLocaleString('zh-CN'),
            HMI布局: layoutText(sr.layout),
            评分维度: TLX_LABELS[dim] ?? dim,
            评分: val,
          })
        })
      })
    })
    return rows
  }, [records])

  // -------- 渲染 --------
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="正在从数据库加载..." />
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message="数据加载失败" description={error} showIcon />
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        数据分析
      </Title>

      <Card>
        <Tabs
          items={[
            // ===== 指标概览 =====
            {
              key: 'overview',
              label: '指标概览',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic title="总记录数" value={stats.total} suffix="条" />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="有效完成"
                        value={stats.completed}
                        suffix={`/ ${stats.total}`}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="不合格被试"
                        value={stats.disqualified}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="平均年龄"
                        value={stats.avgAge || '--'}
                        precision={1}
                        suffix="岁"
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="图形测验平均总分"
                        value={stats.avgEftScore ? stats.avgEftScore.toFixed(1) : '--'}
                        suffix="/ 10"
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="图形测验平均反应时"
                        value={stats.avgEftRt ? Math.round(stats.avgEftRt) : '--'}
                        suffix="ms"
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic title="男性被试" value={stats.genderCount.male} suffix="人" />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic title="女性被试" value={stats.genderCount.female} suffix="人" />
                    </Card>
                  </Col>
                </Row>
              ),
            },

            // ===== 数据明细 =====
            {
              key: 'table',
              label: '数据明细',
              children: (
                <Tabs
                  items={[
                    {
                      key: 'screening',
                      label: '流程一：信息采集',
                      children: (
                        <Table
                          size="small"
                          dataSource={screeningRows}
                          pagination={{ pageSize: 20, size: 'small' }}
                          scroll={{ x: 1200 }}
                        />
                      ),
                    },
                    {
                      key: 'eft',
                      label: '流程二：图形测验逐题',
                      children: (
                        <Table
                          size="small"
                          dataSource={eftRows}
                          pagination={{ pageSize: 20, size: 'small' }}
                          scroll={{ x: 600 }}
                        />
                      ),
                    },
                    {
                      key: 'takeover',
                      label: '流程三：接管测试逐次',
                      children: (
                        <Table
                          size="small"
                          dataSource={takeoverRows}
                          pagination={{ pageSize: 20, size: 'small' }}
                          scroll={{ x: 600 }}
                        />
                      ),
                    },
                    {
                      key: 'survey',
                      label: '流程四：主观调研逐题',
                      children: (
                        <Table
                          size="small"
                          dataSource={surveyRows}
                          pagination={{ pageSize: 20, size: 'small' }}
                          scroll={{ x: 600 }}
                        />
                      ),
                    },
                  ]}
                />
              ),
            },

            // ===== 图表分析 =====
            {
              key: 'chart',
              label: '图表分析',
              children:
                records.length === 0 ? (
                  <Empty description="暂无数据，无法生成图表" />
                ) : (
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {takeoverChartData.length > 0 && (
                      <Card size="small" title="各布局接管反应时对比（ms，越低越好）">
                        <G2Chart
                          render={(chart: Chart) => {
                            chart
                              .interval()
                              .data(takeoverChartData)
                              .encode('x', 'layout')
                              .encode('y', 'avgRt')
                              .encode('color', 'layout')
                              .style({ radius: 6 })
                              .label({ text: 'avgRt', position: 'top' })
                          }}
                        />
                      </Card>
                    )}

                    {hitRateChartData.length > 0 && (
                      <Card size="small" title="各布局命中率对比（%，越高越好）">
                        <G2Chart
                          render={(chart: Chart) => {
                            chart
                              .interval()
                              .data(hitRateChartData)
                              .encode('x', 'layout')
                              .encode('y', 'hitRate')
                              .encode('color', 'layout')
                              .style({ radius: 6 })
                              .label({ text: 'hitRate', position: 'top' })
                          }}
                        />
                      </Card>
                    )}

                    {tlxChartData.length > 0 && (
                      <Card size="small" title="NASA-TLX 各维度评分对比（按布局）">
                        <G2Chart
                          height={400}
                          render={(chart: Chart) => {
                            chart
                              .point()
                              .data(tlxChartData)
                              .encode('x', 'dimension')
                              .encode('y', 'score')
                              .encode('color', 'layout')
                              .encode('shape', 'point')
                              .style({ r: 5 })
                            chart
                              .line()
                              .data(tlxChartData)
                              .encode('x', 'dimension')
                              .encode('y', 'score')
                              .encode('color', 'layout')
                          }}
                        />
                      </Card>
                    )}

                    {eftScoreChartData.length > 0 && (
                      <Card size="small" title="各被试图形测验得分分布（≥7为场独立型）">
                        <G2Chart
                          render={(chart: Chart) => {
                            chart
                              .interval()
                              .data(eftScoreChartData)
                              .encode('x', 'subject')
                              .encode('y', 'score')
                              .encode('color', 'style')
                              .style({ radius: 4 })
                              .label({ text: 'score', position: 'top' })
                          }}
                        />
                      </Card>
                    )}
                  </Space>
                ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default Analysis
