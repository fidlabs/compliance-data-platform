-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit
-- @param {Boolean} $2:testnet? TRUE if using Filecoin testnet

WITH constants AS (
    SELECT
        CASE
            WHEN $2 IS TRUE THEN 1667326380
            ELSE 1598306400
        END AS genesis_ts
),
deals_with_rails AS (
    SELECT
        d."dealId" AS deal_id,
        r.token AS token_address,
        date_trunc(
            $1,
            timezone(
                'UTC',
                to_timestamp(
                    r."createdAtBlock" * 30 + c.genesis_ts
                )
            )
        )::DATE AS window_start
    FROM po_rep_deal d
    INNER JOIN filecoin_pay_rail r
        ON d."railId" = r."railId"
    CROSS JOIN constants c
    WHERE NOT EXISTS (
        SELECT 1
        FROM po_rep_deal_state_change dsc
        WHERE dsc.deal_id = d."dealId"
            AND dsc.state = 'REJECTED'
        LIMIT 1
    )
),
window_totals AS (
    SELECT
        dwr.window_start,
        dwr.token_address,
        SUM(
            -- Calculate total deal value
            ceil(dt.deal_size_bytes::DECIMAL / 34359738368) * -- Sector count assuming 32GiB sectors
            dt.price_per_sector_per_month *
            ceil(dt.duration_days::DECIMAL / 30) -- Number of months
        )::DECIMAL AS window_total
    FROM deals_with_rails dwr
    INNER JOIN po_rep_deal_terms dt
        ON dt.deal_id = dwr.deal_id
    GROUP BY 1, 2
)

SELECT
    window_start,
    token_address,
    window_total
FROM window_totals
ORDER BY window_start;