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
        ) - interval '1 week', -- start week ahead of nv22
        current_timestamp,
        '1 week'::interval
      ) AS "dates"
  ),
  "old_allocators_weekly" AS (
    SELECT DISTINCT
      "weeks"."week",
      "old_datacap_balance_nv22"."allocator"
    FROM
      "weeks",
      "old_datacap_balance_nv22"
  ),
  "old_dc_balance" AS (
    SELECT
      "old_allocators_weekly"."week",
      "old_allocators_weekly"."allocator",
      greatest(
        0,
        (
          "old_datacap_balance_nv22"."old_dc_balance" - coalesce(
            "allocators_weekly_acc"."total_sum_of_allocations",
            0
          )
        )
      ) AS "old_dc_balance"
    FROM
      "old_allocators_weekly"
      INNER JOIN "old_datacap_balance_nv22" USING (
        "allocator"
      )
      LEFT JOIN "allocators_weekly_acc" USING (
        "week",
        "allocator"
      )
  )
SELECT
  "week",
  "allocator",
  "old_dc_balance",
  coalesce(
    (
      lag(
        "old_dc_balance"
      ) OVER (
        PARTITION BY
          "allocator"
        ORDER BY
          "week" ASC
      ) - "old_dc_balance"
    ),
    0
  ) AS "allocations"
FROM
  "old_dc_balance"
ORDER BY
  "week";
