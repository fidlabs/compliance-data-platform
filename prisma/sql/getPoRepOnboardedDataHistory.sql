-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit
-- @param {Boolean} $2:testnet? TRUE if using Filecoin testnet

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
                    MIN(d."proposedAtBlock") * 30 + c.genesis_ts
                )
            )
        )::DATE AS start_window,
        date_trunc(
            $1,
            timezone('UTC', NOW())
        )::DATE AS end_window
    FROM po_rep_deal d
    CROSS JOIN constants c
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
rail_activations AS (
    SELECT
        r."railId",
        date_trunc(
            $1,
            timezone(
                'UTC',
                to_timestamp(
                    r."activatedAtBlock" * 30 + c.genesis_ts
                )
            )
        )::DATE AS activation_date_truncated
    FROM filecoin_pay_rail r
    CROSS JOIN constants c
),
window_totals AS (
    SELECT
        ra.activation_date_truncated as window_start,
        SUM(d."totalDealSize") AS window_total
    FROM rail_activations ra
    JOIN po_rep_deal d
        ON d."railId" = ra."railId"
    GROUP BY ra.activation_date_truncated
)

SELECT
    wd.window_start,
    COALESCE(wt.window_total, 0) AS window_total,
    SUM(COALESCE(wt.window_total, 0)) OVER (
        ORDER BY wd.window_start
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_total
FROM windows_dates wd
LEFT JOIN window_totals wt
    ON wt.window_start = wd.window_start
ORDER BY wd.window_start;