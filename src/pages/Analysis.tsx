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
import type { ColumnsType } from 'antd/es/table'
import G2Chart from '../components/G2Chart'
import { useExperimentData, LAYOUT_LABELS_MAP } from '../lib/useExperimentData'
import type { Chart } from '@antv/g2'

const { Title, Text } = Typography

/** 从数据行的键自动生成表格列定义 */
function buildColumns<T extends Record<string, unknown>>(rows: T[]): ColumnsType<T> {
  if (rows.length === 0) return []
  return Object.keys(rows[0])
    .filter((k) => k !== 'key')
    .map((k) => ({
      title: k,
      dataIndex: k,
      key: k,
      ellipsis: true,
      width: k === '提交时间' ? 180 : undefined,
      render: (val: unknown) => (val === null || val === undefined ? '-' : String(val)),
    }))
}

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

  // 性别分布（用于环图）
  const genderChartData = useMemo(() => {
    return [
      { type: '男', value: stats.genderCount.male },
      { type: '女', value: stats.genderCount.female },
    ].filter((d) => d.value > 0)
  }, [stats])

  // 年龄分布（用于直方图分箱）
  const ageChartData = useMemo(() => {
    const allAges = records
      .map((r) => r.demographic?.age)
      .filter((a): a is number => typeof a === 'number' && a > 0)
    if (allAges.length === 0) return []
    // 按 10 的区间分箱：20-29, 30-39, 40-49, 50+
    const buckets: Record<string, number> = {}
    allAges.forEach((age) => {
      let key: string
      if (age < 30) key = '20-29'
      else if (age < 40) key = '30-39'
      else if (age < 50) key = '40-49'
      else key = '50+'
      buckets[key] = (buckets[key] || 0) + 1
    })
    return ['20-29', '30-39', '40-49', '50+']
      .filter((k) => buckets[k])
      .map((k) => ({ range: k, count: buckets[k] }))
  }, [records])

  // 认知风格分布（用于环图）
  const cognitiveStyleChartData = useMemo(() => {
    let fi = 0
    let fd = 0
    records.forEach((r) => {
      if (r.eft) {
        if (r.eft.totalScore >= 7) fi++
        else fd++
      }
    })
    return [
      { type: '场独立型 (FI)', value: fi },
      { type: '场依存型 (FD)', value: fd },
    ].filter((d) => d.value > 0)
  }, [records])

  // 图形测验逐题正确率（用于折线/条形图）
  const eftPerQuestionChartData = useMemo(() => {
    const buckets: Record<number, { correct: number; total: number }> = {}
    records.forEach((r) => {
      r.eft?.results.forEach((q) => {
        if (!buckets[q.questionIndex]) buckets[q.questionIndex] = { correct: 0, total: 0 }
        buckets[q.questionIndex].total++
        if (q.isCorrect) buckets[q.questionIndex].correct++
      })
    })
    return Object.keys(buckets)
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .map((k) => ({
        question: `第${k + 1}题`,
        accuracy: Math.round((buckets[k].correct / buckets[k].total) * 1000) / 10,
      }))
  }, [records])

  // 认知风格 × 接管反应时散点数据
  const scatterChartData = useMemo(() => {
    const result: {
      subject: string
      eftScore: number
      avgRt: number
      style: string
    }[] = []
    records.forEach((r, i) => {
      if (r.eft && r.takeover && r.takeover.trials.length > 0) {
        const avgRt =
          r.takeover.trials.reduce((s, t) => s + t.reactionTime, 0) /
          r.takeover.trials.length
        result.push({
          subject: `被试${i + 1}`,
          eftScore: r.eft.totalScore,
          avgRt: Math.round(avgRt),
          style: r.eft.totalScore >= 7 ? '场独立型' : '场依存型',
        })
      }
    })
    return result
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
                          columns={buildColumns(screeningRows)}
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
                          columns={buildColumns(eftRows)}
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
                          columns={buildColumns(takeoverRows)}
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
                          columns={buildColumns(surveyRows)}
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
                    {/* ===== 流程一：人口学分布 ===== */}
                    <Card size="small" title="流程一 · 被试人口学分布">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">性别分布</Text>
                          </div>
                          {genderChartData.length > 0 ? (
                            <G2Chart
                              render={(chart: Chart) => {
                                chart
                                  .interval()
                                  .data(genderChartData)
                                  .encode('y', 'value')
                                  .encode('color', 'type')
                                  .encode('key', 'type')
                                  .transform({ type: 'stackY' })
                                  .label({
                                    text: 'value',
                                    position: 'outside',
                                  })
                                  .coordinate({ type: 'theta', outerRadius: 0.8 })
                                  .legend('color', { position: 'bottom' })
                              }}
                            />
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </Col>
                        <Col xs={24} lg={12}>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">年龄分布</Text>
                          </div>
                          {ageChartData.length > 0 ? (
                            <G2Chart
                              render={(chart: Chart) => {
                                chart
                                  .interval()
                                  .data(ageChartData)
                                  .encode('x', 'range')
                                  .encode('y', 'count')
                                  .encode('color', 'range')
                                  .style({ radius: 6 })
                                  .label({ text: 'count', position: 'top' })
                              }}
                            />
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </Col>
                      </Row>
                    </Card>

                    {/* ===== 流程二：EFT 图形测验 ===== */}
                    <Card size="small" title="流程二 · 镶嵌图形测验（EFT）">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">认知风格分布（总分≥7为场独立型）</Text>
                          </div>
                          {cognitiveStyleChartData.length > 0 ? (
                            <G2Chart
                              render={(chart: Chart) => {
                                chart
                                  .interval()
                                  .data(cognitiveStyleChartData)
                                  .encode('y', 'value')
                                  .encode('color', 'type')
                                  .encode('key', 'type')
                                  .transform({ type: 'stackY' })
                                  .label({
                                    text: 'value',
                                    position: 'outside',
                                  })
                                  .coordinate({ type: 'theta', outerRadius: 0.8 })
                                  .legend('color', { position: 'bottom' })
                              }}
                            />
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </Col>
                        <Col xs={24} lg={12}>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">逐题正确率（%）</Text>
                          </div>
                          {eftPerQuestionChartData.length > 0 ? (
                            <G2Chart
                              render={(chart: Chart) => {
                                chart
                                  .interval()
                                  .data(eftPerQuestionChartData)
                                  .encode('x', 'question')
                                  .encode('y', 'accuracy')
                                  .encode('color', 'question')
                                  .style({ radius: 4 })
                                  .label({ text: 'accuracy', position: 'top' })
                                chart
                                  .lineY(100)
                                  .style({
                                    stroke: '#52c41a',
                                    strokeOpacity: 0.5,
                                    lineDash: [4, 4],
                                  })
                              }}
                            />
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </Col>
                      </Row>
                      {eftScoreChartData.length > 0 && (
                        <>
                          <div style={{ marginTop: 8, marginBottom: 8 }}>
                            <Text type="secondary">各被试得分分布</Text>
                          </div>
                          <G2Chart
                            height={300}
                            render={(chart: Chart) => {
                              chart
                                .interval()
                                .data(eftScoreChartData)
                                .encode('x', 'subject')
                                .encode('y', 'score')
                                .encode('color', 'style')
                                .style({ radius: 4 })
                                .label({ text: 'score', position: 'top' })
                              chart
                                .lineY(7)
                                .style({
                                  stroke: '#faad14',
                                  strokeOpacity: 0.7,
                                  lineDash: [4, 4],
                                })
                                .label({
                                  text: '场独立型阈值 7',
                                  position: 'right',
                                  textBaseline: 'bottom',
                                  dy: -4,
                                })
                            }}
                          />
                        </>
                      )}
                    </Card>

                    {/* ===== 流程三：接管测试 ===== */}
                    <Card size="small" title="流程三 · L3 接管绩效测试">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} lg={12}>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">各布局平均接管反应时（ms，越低越好）</Text>
                          </div>
                          {takeoverChartData.length > 0 ? (
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
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </Col>
                        <Col xs={24} lg={12}>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">各布局命中率（%，越高越好）</Text>
                          </div>
                          {hitRateChartData.length > 0 ? (
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
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </Col>
                      </Row>
                    </Card>

                    {/* ===== 流程四：NASA-TLX 雷达图 ===== */}
                    {tlxChartData.length > 0 && (
                      <Card
                        size="small"
                        title="流程四 · NASA-TLX 主观负荷雷达图（各布局六维度对比）"
                      >
                        <G2Chart
                          height={460}
                          render={(chart: Chart) => {
                            chart
                              .data(tlxChartData)
                              .encode('x', 'dimension')
                              .encode('y', 'score')
                              .encode('color', 'layout')
                              .encode('key', 'layout')
                              .scale('x', { type: 'point' })
                              .scale('y', { domain: [0, 100] })
                              .coordinate({ type: 'polar' })
                              .layer()
                              .line()
                              .label(false)
                            chart.point().encode('x', 'dimension').encode('y', 'score').encode('color', 'layout').style({ r: 4 })
                            chart.legend('color', { position: 'bottom' })
                          }}
                        />
                      </Card>
                    )}

                    {/* ===== 综合：认知风格 × 接管绩效散点图 ===== */}
                    {scatterChartData.length > 0 && (
                      <Card
                        size="small"
                        title="综合分析 · 认知风格与接管反应时关系（散点图）"
                      >
                        <G2Chart
                          height={400}
                          render={(chart: Chart) => {
                            chart
                              .point()
                              .data(scatterChartData)
                              .encode('x', 'eftScore')
                              .encode('y', 'avgRt')
                              .encode('color', 'style')
                              .encode('shape', 'point')
                              .encode('size', 6)
                              .style({ fillOpacity: 0.75, stroke: '#fff', strokeOpacity: 0.3 })
                              .label({
                                text: 'subject',
                                position: 'top',
                                fontSize: 10,
                                fillOpacity: 0.7,
                              })
                              .axis('x', { title: '镶嵌图形测验总分（≥7为场独立型）' })
                              .axis('y', { title: '平均接管反应时 (ms)' })
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
