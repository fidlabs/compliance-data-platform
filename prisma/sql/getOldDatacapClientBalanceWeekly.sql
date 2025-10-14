WITH
  "weeks" AS (
    SELECT
      date_trunc(
        'week',
        "dates"
      ) AS "week"
    FROM
      generate_series(
        to_timestamp(
          3698160 * 30 + 1598306400
        ) - interval '1 week', -- 1 week before start of nv22
        current_timestamp,
        '1 week'::interval
      ) AS "dates"
  ),
  "base_balance" AS (
    SELECT
      "week",
      "client",
      "old_dc_balance"
    FROM
      "weeks",
      "old_datacap_client_balance_nv22"
  ),
  "dc_usage" AS (
    SELECT
      "week",
      "client",
      "allocator",
      "sum_of_allocations",
      sum(
        "sum_of_allocations"
      ) OVER (
        PARTITION BY
          "allocator"
        ORDER BY
          "week" ASC,
          "client" ASC
      ) AS "total_used_by_allocator"
    FROM
      "client_allocator_distribution_weekly"
    ORDER BY
      "week"
  ),
  "remaining_old_dc" AS (
    SELECT
      "dc_usage"."week",
      "dc_usage"."client",
      "dc_usage"."sum_of_allocations",
      "old_datacap_balance_nv22"."old_dc_balance" - "dc_usage"."total_used_by_allocator" AS "remaining_old_dc_on_allocator"
    FROM
      "dc_usage"
      INNER JOIN "old_datacap_balance_nv22" USING (
        "allocator"
      )
  ),
  "old_dc_allocations" AS (
    SELECT
      "week",
      "client",
      sum(
        greatest(
          0,
          least(
            "sum_of_allocations",
            "sum_of_allocations" + "remaining_old_dc_on_allocator"
          )
        )
      )::bigint AS "old_dc_allocated"
    FROM
      "remaining_old_dc"
    GROUP BY
      "week",
      "client"
  ),
  "weekly_claims" AS (
    SELECT
      "client",
      date_trunc(
        'week',
        "hour"
      ) AS "week",
      sum(
        "total_deal_size"
      ) AS "total_claims"
    FROM
      "client_claims_hourly"
    GROUP BY
      "client",
      "week"
  ),
  "old_dc_balance" AS (
    SELECT
      "week",
      "client",
      "total_claims",
      sum(
        coalesce(
          "old_dc_allocations"."old_dc_allocated",
          0
        )
      ) OVER (
        PARTITION BY
          "client",
          "week"
      ) AS "allocations",
      greatest(
        0,
        coalesce(
          "base_balance"."old_dc_balance",
          0
        ) -- what client had at current fil+ edition start
        + sum(
          coalesce(
            "old_dc_allocations"."old_dc_allocated",
            0
          )
        ) OVER "w" -- old dc client got up to this week
        - sum(
          coalesce(
            "weekly_claims"."total_claims",
            0
          )
        ) OVER "w" -- all client spent up to this week
      ) AS "old_dc_balance"
    FROM
      "old_dc_allocations"
      FULL JOIN "base_balance" USING (
        "week",
        "client"
      )
      LEFT JOIN "weekly_claims" USING (
        "week",
        "client"
      )
    WINDOW
      "w" AS (
        PARTITION BY
          "client"
        ORDER BY
          "week"
      )
  ),
  "balance_and_claims" AS (
    SELECT
      "week",
      "client",
      "old_dc_balance"::bigint,
      "allocations",
      "total_claims",
      coalesce(
        (
          lag(
            "old_dc_balance"
          ) OVER (
            PARTITION BY
              "client"
            ORDER BY
              "week" ASC
          ) -- balance from previous week
          + "allocations" -- what we got from allocator this week
          - "old_dc_balance" -- current balance
        ),
        0
      )::bigint AS "claims"
    FROM
      "old_dc_balance"
  )
SELECT
  "week",
  "client",
  "allocations",
  "old_dc_balance"::bigint,
  "total_claims",
  "claims"::bigint
FROM
  "balance_and_claims"
WHERE
  (
    "old_dc_balance" > 0
    OR "claims" > 0
  )
ORDER BY
  "week";
