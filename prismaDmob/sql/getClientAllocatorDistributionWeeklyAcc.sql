WITH
  "distributions" AS (
    SELECT
      date_trunc(
        'week',
        to_timestamp(
          "height" * 30 + 1598306400
        )
      ) AS "week",
      "addressId" AS "client",
      "verifierAddressId" AS "allocator",
      count(*) AS "num_of_allocations",
      sum(
        "allowance"
      ) AS "sum_of_allocations"
    FROM
      "verified_client_allowance"
    WHERE
      "height" >= 3698160 -- current fil+ edition start
    GROUP BY
      "week",
      "client",
      "allocator"
  ),
  "weeks" AS (
    SELECT
      date_trunc(
        'week',
        "dates"
      ) "week"
    FROM
      generate_series(
        to_timestamp(
          3698160 * 30 + 1598306400
        ),
        current_timestamp,
        '1 week'::interval
      ) "dates"
  )
SELECT
  "weeks"."week" AS "week",
  "client" AS "client",
  "allocator" AS "allocator",
  sum(
    "num_of_allocations"
  )::int AS "num_of_allocations",
  sum(
    "sum_of_allocations"
  )::bigint AS "sum_of_allocations"
FROM
  "weeks"
  INNER JOIN "distributions" ON "weeks"."week" >= "distributions"."week"
GROUP BY
  "weeks"."week",
  "client",
  "allocator";
