-- ============================================================
-- 修正 experiment_records 表中 survey 字段的 TLX 评分
-- 问题：web端维度1/2/3/5/6端点反转 + 维度4需反向计分
-- 修正：全部6个维度统一 100 - X
-- 范围：所有 survey 不为空的记录（61条）
-- ============================================================
-- 操作说明：
--   1. 在 Supabase Dashboard > SQL Editor 中执行
--   2. 全选以下代码运行
--   3. 执行后查看输出验证结果
-- ============================================================

-- ====== 第一步：备份原始 survey 数据到新列 ======
ALTER TABLE experiment_records ADD COLUMN IF NOT EXISTS survey_original jsonb;

UPDATE experiment_records
SET survey_original = survey
WHERE survey IS NOT NULL;

-- ====== 第二步：修正 survey 数据 ======
-- 对 survey->results 数组中每个元素的 ratings 做 100 - X
UPDATE experiment_records
SET survey = jsonb_set(
  survey,
  '{results}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  result,
                  '{ratings,mentalDemand}',
                  to_jsonb(100 - (result->'ratings'->>'mentalDemand')::int)
                ),
              '{ratings,physicalDemand}',
              to_jsonb(100 - (result->'ratings'->>'physicalDemand')::int)
              ),
            '{ratings,temporalDemand}',
            to_jsonb(100 - (result->'ratings'->>'temporalDemand')::int)
            ),
          '{ratings,performance}',
          to_jsonb(100 - (result->'ratings'->>'performance')::int)
          ),
        '{ratings,effort}',
        to_jsonb(100 - (result->'ratings'->>'effort')::int)
        ),
      '{ratings,frustration}',
      to_jsonb(100 - (result->'ratings'->>'frustration')::int)
      )
    )
    FROM jsonb_array_elements(survey->'results') AS result
  )
)
WHERE survey IS NOT NULL;

-- ====== 第三步：验证修正结果 ======
-- 查看前5条记录修正前后的对比
SELECT
  id,
  survey_original->'results'->0->'ratings' AS 修正前_第一个布局,
  survey->'results'->0->'ratings' AS 修正后_第一个布局
FROM experiment_records
WHERE survey IS NOT NULL
ORDER BY id
LIMIT 5;

-- 验证：修正后各布局 RTLX 均值（应与 results_corrected.json 一致）
SELECT
  (elem->>'layout') AS layout,
  ROUND(AVG(
    ((elem->'ratings'->>'mentalDemand')::int +
     (elem->'ratings'->>'physicalDemand')::int +
     (elem->'ratings'->>'temporalDemand')::int +
     (elem->'ratings'->>'performance')::int +
     (elem->'ratings'->>'effort')::int +
     (elem->'ratings'->>'frustration')::int) / 6.0
  ), 2) AS rtlx_mean
FROM experiment_records
CROSS JOIN LATERAL jsonb_array_elements(survey->'results') AS elem
WHERE survey IS NOT NULL
GROUP BY elem->>'layout'
ORDER BY rtlx_mean DESC;

-- 验证：受影响行数
SELECT
  COUNT(*) AS 修正的记录数,
  COUNT(survey_original) AS 已备份的记录数
FROM experiment_records
WHERE survey IS NOT NULL;

-- ====== 可选：确认无误后删除备份列 ======
-- 取消下面两行的注释来删除备份（建议保留几天确认无误后再删）
-- ALTER TABLE experiment_records DROP COLUMN survey_original;
