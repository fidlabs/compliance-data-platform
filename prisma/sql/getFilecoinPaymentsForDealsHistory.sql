-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit
-- @param {Boolean} $2:testnet?

WITH truncated_payments AS (
    SELECT
        date_trunc(
            $1,
            timezone(
                'UTC',
                to_timestamp(
                    p."createdAtBlock" * 30 +
                    CASE
                        WHEN $2 IS TRUE THEN 1667326380
                        ELSE 1598306400
                    END
                )
            )
        )::DATE AS window_start,
        r.token as token_address,
        SUM(p."netPayeeAmount") AS window_total
    FROM filecoin_pay_payment p
    INNER JOIN filecoin_pay_rail r
        ON r."railId" = p."railId"
    WHERE EXISTS (
        SELECT 1
        FROM po_rep_deal d
        WHERE d."railId" = p."railId"
    )
    GROUP BY 1, 2
)

SELECT
    window_start,
    token_address,
    window_total
FROM truncated_payments
ORDER BY window_start;