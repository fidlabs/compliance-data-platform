-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit

WITH bounds AS (
    SELECT
        date_trunc(
            $1,
            timezone(
                'UTC',
                MIN(cda.timestamp)
            )
        )::DATE AS start_window,
        date_trunc(
            $1,
            timezone('UTC', NOW())
        )::DATE AS end_window
    FROM client_datacap_allocation cda
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
window_totals AS (
    SELECT
        date_trunc(
            $1,
            timezone(
                'UTC',
                cda.timestamp
            )
        )::DATE AS window_start,
        SUM(cda.allocation) AS window_total
    FROM client_datacap_allocation cda
    LEFT JOIN allocator
        ON allocator.id = cda.allocator_id
    WHERE 
        allocator.is_metaallocator = FALSE AND
        allocator.id NOT IN ('f01940930','f03018491','f01858410', 'f02049625')
    GROUP BY window_start
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