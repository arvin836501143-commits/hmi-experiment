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
  Tag,
  Space,
} from 'antd'
import G2Chart from '../components/G2Chart'
import { useExperimentData, LAYOUT_LABELS_MAP } from '../lib/useExperimentData'
import type { ExperimentRecordRow } from '../lib/useExperimentData'
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

function Analysis() {
  const { records, loading, error } = useExperimentData()

  // -------- 统计派生数据 --------
  const stats = useMemo(() => {
    const total = records.length
    const disqualified = records.filter((r) => r.disqualify_reason).length
    const completed = records.filter(
      (r) => r.eft && r.takeover && r.survey,
    ).length

    // EFT 总分统计
    const eftRecords = records.filter((r) => r.eft)
    const avgEftScore =
      eftRecords.length > 0
        ? eftRecords.reduce((s, r) => s + (r.eft!.totalScore || 0), 0) /
          eftRecords.length
        : 0

    // EFT 平均反应时
    const eftRts = eftRecords
      .filter((r) => r.eft!.avgCorrectResponseTime !== null)
      .map((r) => r.eft!.avgCorrectResponseTime!)
    const avgEftRt =
      eftRts.length > 0
        ? eftRts.reduce((s, v) => s + v, 0) / eftRts.length
        : 0

    // 接管测试反应时（按布局分组）
    const takeoverByLayout: Record<string, number[]> = {}
    records.forEach((r) => {
      r.takeover?.trials.forEach((t) => {
        if (!takeoverByLayout[t.layout]) takeoverByLayout[t.layout] = []
        takeoverByLayout[t.layout].push(t.reactionTime)
      })
    })

    // 命中率（按布局）
    const hitRateByLayout: Record<string, { hit: number; total: number }> = {}
    records.forEach((r) => {
      r.takeover?.trials.forEach((t) => {
        if (!hitRateByLayout[t.layout]) hitRateByLayout[t.layout] = { hit: 0, total: 0 }
        hitRateByLayout[t.layout].total++
        if (t.hit) hitRateByLayout[t.layout].hit++
      })
    })

    // NASA-TLX 各维度平均分（按布局）
    const tlxByLayout: Record<
      string,
      Record<string, number[]>
    > = {}
    records.forEach((r) => {
      r.survey?.results.forEach((sr) => {
        if (!tlxByLayout[sr.layout]) tlxByLayout[sr.layout] = {}
        Object.entries(sr.ratings).forEach(([dim, val]) => {
          if (!tlxByLayout[sr.layout][dim]) tlxByLayout[sr.layout][dim] = []
          tlxByLayout[sr.layout][dim].push(val)
        })
      })
    })

    // 人口学统计
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

  // -------- 表格列 --------
  const detailColumns = [
    {
      title: '编号',
      dataIndex: 'id',
      width: 70,
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '年龄',
      dataIndex: ['demographic', 'age'],
      width: 70,
    },
    {
      title: '性别',
      dataIndex: ['demographic', 'gender'],
      width: 70,
      render: (v: string) => (v === 'male' ? '男' : v === 'female' ? '女' : '-'),
    },
    {
      title: 'EFT总分',
      key: 'eftScore',
      width: 90,
      render: (_: unknown, r: ExperimentRecordRow) =>
        r.eft ? `${r.eft.totalScore}/10` : '-',
    },
    {
      title: '认知风格',
      key: 'cogStyle',
      width: 100,
      render: (_: unknown, r: ExperimentRecordRow) => {
        if (!r.eft) return '-'
        return r.eft.totalScore >= 7 ? (
          <Tag color="green">场独立型</Tag>
        ) : (
          <Tag color="orange">场依存型</Tag>
        )
      },
    },
    {
      title: '接管命中',
      key: 'takeoverHits',
      width: 90,
      render: (_: unknown, r: ExperimentRecordRow) => {
        if (!r.takeover) return '-'
        const hits = r.takeover.trials.filter((t) => t.hit).length
        return `${hits}/${r.takeover.trials.length}`
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, r: ExperimentRecordRow) => {
        if (r.disqualify_reason)
          return <Tag color="red">{DISQUALIFY_LABELS[r.disqualify_reason] ?? '不合格'}</Tag>
        if (r.eft && r.takeover && r.survey) return <Tag color="green">已完成</Tag>
        return <Tag color="blue">进行中</Tag>
      },
    },
  ]

  // -------- 渲染 --------
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="正在从数据库加载..." />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="数据加载失败"
        description={error}
        showIcon
      />
    )
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
                        title="EFT平均总分"
                        value={stats.avgEftScore ? stats.avgEftScore.toFixed(1) : '--'}
                        suffix="/ 10"
                      />
                    </Card>
                  </Col>
                  <Col xs={12} md={6}>
                    <Card size="small">
                      <Statistic
                        title="EFT平均反应时"
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
                <Table
                  size="small"
                  columns={detailColumns}
                  dataSource={records.map((r) => ({ ...r, key: r.id }))}
                  pagination={{ pageSize: 20, size: 'small' }}
                  scroll={{ x: 800 }}
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
                    {/* 接管反应时对比 */}
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

                    {/* 命中率对比 */}
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

                    {/* NASA-TLX 雷达图 */}
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

                    {/* EFT 得分分布 */}
                    {eftScoreChartData.length > 0 && (
                      <Card size="small" title="各被试 EFT 得分分布（≥7为场独立型）">
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
