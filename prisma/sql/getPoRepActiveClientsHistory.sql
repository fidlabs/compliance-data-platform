-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit
-- @param {Boolean} $2:testnet? TRUE if using Filecoin testnet
-- @param {BigInt}  $3:providerId? Optional filter by Provider ID

-- Select distinct active clients count for each window. Client is considered 
-- active if they have at least one completed deal before or during
-- the window, that wasn't terminated before window start.
WITH constants AS (
    SELECT
        CASE
            WHEN $2 IS TRUE THEN 1667326380
            ELSE 1598306400
        END AS genesis_ts
),
deal_bounds AS (
  SELECT
    d."dealId" AS deal_id,
    d.client,
    date_trunc(
        $1,
        timezone(
            'UTC',
            to_timestamp(
                MIN(sc.changed_at_block) FILTER (
                  WHERE sc.state = 'COMPLETED'
                ) * 30 + c.genesis_ts
            )
        )
    )::DATE AS window_start,
    date_trunc(
        $1,
        timezone(
            'UTC',
            to_timestamp(
                MIN(sc.changed_at_block) FILTER (
                  WHERE sc.state = 'TERMINATED'
                ) * 30 + c.genesis_ts
            )
        )
    )::DATE AS window_end
  FROM po_rep_deal d
  LEFT JOIN po_rep_deal_state_change sc
    ON sc.deal_id = d."dealId"
  CROSS JOIN constants c
  WHERE $3::BIGINT IS NULL
    OR d."providerId" = $3
  GROUP BY c.genesis_ts, d."dealId", d.client
  HAVING
    COUNT(*) FILTER (WHERE sc.state = 'COMPLETED') > 0
),
bounds AS (
    SELECT
        MIN(pdb.window_start) AS start_window,
        date_trunc(
            $1,
            timezone('UTC', NOW())
        )::DATE AS end_window
    FROM deal_bounds pdb
),
windows_dates AS (
    SELECT
        generate_series(
            b.start_window,
            b.end_window,
            CAST('1 ' || $1 AS INTERVAL)
        )::DATE AS window_start
    FROM bounds b
)

SELECT
    wd.window_start,
    COALESCE(COUNT(DISTINCT pdb.client), 0)::INT AS active_clients_count
FROM windows_dates wd
LEFT JOIN deal_bounds pdb
    ON pdb.window_start <= wd.window_start
		AND (pdb.window_end IS NULL OR pdb.window_end >= wd.window_start)
GROUP BY wd.window_start
ORDER BY wd.window_start;

