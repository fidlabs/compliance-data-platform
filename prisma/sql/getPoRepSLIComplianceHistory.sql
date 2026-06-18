-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit
-- @param {Boolean} $2:testnet? TRUE if using Filecoin testnet
-- @param {String} $3:metricType? Metric type to check compliance by, NULL for all metrics
-- @param {BigInt} $4:providerId? Optional filter by Provider ID
-- @param {BigInt} $5:dealId? Optional filter by Deal ID

WITH constants AS (
    SELECT
        CASE
            WHEN $2 IS TRUE THEN 1667326380
            ELSE 1598306400
        END AS genesis_ts
),
bounds AS (
    SELECT
        date_trunc(
            $1,
            timezone(
                'UTC',
                to_timestamp(
                    MIN(r."activatedAtBlock") * 30 + c.genesis_ts
                )
            )
        )::DATE AS start_window,
        date_trunc(
            $1,
            timezone('UTC', NOW())
        )::DATE AS end_window
    FROM po_rep_deal d
    INNER JOIN filecoin_pay_rail r
        ON r."railId" = d."railId"
    CROSS JOIN constants c
    WHERE r."activatedAtBlock" > 0
        AND ($4::BIGINT IS NULL OR $4 = d."providerId")
        AND ($5::BIGINT IS NULL OR $5 = d."dealId")
    GROUP BY c.genesis_ts
),
windows_dates AS (
    SELECT
        generate_series(
            b.start_window,
            b.end_window,
            CAST('1 ' || $1 AS INTERVAL)
        )::DATE AS window_start
    FROM bounds b
),
deals_info AS (
    SELECT
        d."dealId" AS deal_id,
        d."providerId" AS provider_id,
        d."totalDealSize" AS total_deal_size,
        dr."retrievabilityBps"::DECIMAL / 10000 AS min_retrievability,
        dr."bandwidthMbps" AS min_bandwidth_mbps,
        dr."latencyMs" AS max_latency_ms,
        date_trunc(
            $1,
            timezone('UTC', to_timestamp(r."activatedAtBlock" * 30 + c.genesis_ts))
        )::DATE AS min_window_date,
        CASE
            WHEN end_block IS NULL THEN NULL
            ELSE date_trunc(
                $1,
                timezone('UTC', to_timestamp(end_block * 30 + c.genesis_ts))
            )::DATE 
        END AS max_window_date
    FROM po_rep_deal d
    CROSS JOIN constants c
    INNER JOIN po_rep_deal_requirements dr
        ON dr."dealId" = d."dealId"
    INNER JOIN filecoin_pay_rail r
        ON r."railId" = d."railId"
    LEFT JOIN LATERAL (
        SELECT MIN(changed_at_block) AS end_block
        FROM po_rep_deal_state_change dsc
        WHERE dsc.deal_id = d."dealId"
        AND dsc.state IN ('REJECTED', 'TERMINATED')
    ) AS es ON TRUE
    WHERE r."activatedAtBlock" > 0
        AND ($4::BIGINT IS NULL OR d."providerId" = $4)
        AND ($5::BIGINT IS NULL OR d."dealId" = $5)
),
average_measurements AS (
    SELECT
        psp."providerId" AS provider_id,
        metric.metric_type,
        date_trunc(
            $1,
            timezone('UTC', mv.tested_at)
        )::DATE AS window_date,
        AVG(mv.value) AS window_average
    FROM po_rep_storage_provider psp
    JOIN LATERAL (
        SELECT start_window
        FROM bounds
    ) b ON TRUE
    LEFT JOIN storage_provider_url_finder_metric_value mv
        ON mv.provider = 'f0' || psp."providerId"
    LEFT JOIN storage_provider_url_finder_metric metric
        ON metric.id = mv.metric_id
    WHERE tested_at >= b.start_window
        AND (
            ($3::TEXT IS NULL AND metric_type IN (
                'RPA_RETRIEVABILITY',
                'BANDWIDTH',
                'TTFB'
            )) OR (
                metric_type = CAST($3 AS "StorageProviderUrlFinderMetricType")
            )
        )
        AND ($4::BIGINT IS NULL OR psp."providerId" = $4)
    GROUP BY 1, 2, 3
),
deals_compliance AS (
    SELECT
        -- Important, do not duplicate deals per metric. Ordering is important so 
        -- that if any of selected metrics have no measurments we return
        -- NULL (unknown), if any returns FALSE we return FALSE (non-compliant) and
        -- only then we return TRUE (compliant), see ORDER BY clause
        DISTINCT ON (window_start, deal_id)
        window_start,
        di.provider_id,
        deal_id,
        total_deal_size,
        CASE 
            WHEN window_average IS NULL THEN NULL
            WHEN metric_type = 'RPA_RETRIEVABILITY'
                THEN min_retrievability = 0
                    OR window_average >= min_retrievability
            WHEN metric_type = 'BANDWIDTH'
                THEN min_bandwidth_mbps = 0
                    OR window_average >= min_bandwidth_mbps
            WHEN metric_type = 'TTFB'
                THEN max_latency_ms = 0
                    OR window_average <= max_latency_ms
            ELSE NULL
        END AS passed
    FROM windows_dates wd
    LEFT JOIN deals_info di
        ON wd.window_start
            BETWEEN di.min_window_date AND COALESCE(
                di.max_window_date,
                timezone('UTC', CURRENT_DATE)
            )
    LEFT JOIN average_measurements am
        ON am.window_date = wd.window_start AND am.provider_id = di.provider_id
    -- Important so that distinct looks in order NULL -> FALSE -> TRUE
    ORDER BY window_start ASC, deal_id ASC, passed ASC NULLS FIRST 
)

SELECT
    window_start,
    CASE
        WHEN compliance_state IS NULL THEN 'unknown'
        WHEN compliance_state IS FALSE THEN 'noncompliant'
        ELSE 'compliant'
    END AS compliance_state,
    COUNT(DISTINCT provider_id) FILTER (
        WHERE compliance_state IS NOT DISTINCT FROM passed
    )::INT AS providers_count,
    COUNT(deal_id) FILTER (
        WHERE compliance_state IS NOT DISTINCT FROM passed
    )::INT AS deals_count,
    COALESCE(SUM(total_deal_size) FILTER (
        WHERE compliance_state IS NOT DISTINCT FROM passed
    ), 0) AS total_deals_size
FROM deals_compliance
CROSS JOIN LATERAL UNNEST(ARRAY[TRUE, FALSE, NULL]) s(compliance_state)
GROUP BY window_start, compliance_state
ORDER BY window_start ASC;