-- @param {Boolean} $1:testnet?

WITH daily_payments AS (
    SELECT
        to_timestamp(
            p."createdAtBlock" * 30 +
            CASE
                WHEN $1 IS TRUE THEN 1667326380
                ELSE 1598306400
            END
        )::date AS day,
        r.token,
        SUM(p."netPayeeAmount") AS daily_amount
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
    day,
    token,
    daily_amount,
    SUM(daily_amount) OVER (
        PARTITION BY token
        ORDER BY day
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_amount
FROM daily_payments
ORDER BY day;