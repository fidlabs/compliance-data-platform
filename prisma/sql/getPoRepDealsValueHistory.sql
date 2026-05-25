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
deal_acceptance AS (
    SELECT
        dsc.deal_id,
        date_trunc(
            $1,
            timezone(
                'UTC',
                to_timestamp(
                    dsc.changed_at_block * 30 + c.genesis_ts
                )
            )
        )::DATE AS acceptance_date_truncated
    FROM po_rep_deal_state_change dsc
    CROSS JOIN constants c
    WHERE dsc.state = 'ACCEPTED'
),
window_totals AS (
    SELECT
        da.acceptance_date_truncated as window_start,
        SUM(
            -- Calculate total deal value
            ceil(dt.deal_size_bytes::DECIMAL / 34359738368::DECIMAL) * -- Sector count assuming 32GiB sectors
            dt.price_per_sector_per_month *
            (dt.duration_days::DECIMAL / 30::DECIMAL) / -- Number of months
            -- Currently price per sector per month is always in USDFC
            -- When/if that changes the sum will have to be partitioned by token
            1000000
        ) AS window_total
    FROM deal_acceptance da
    JOIN po_rep_deal_terms dt ON dt.deal_id = da.deal_id
    GROUP BY 1
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