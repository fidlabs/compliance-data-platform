SELECT
  date_trunc(
    'week',
    to_timestamp(
      "height" * 30 + 1598306400
    )
  ) AS "week",
  "addressId" AS "client",
  "verifierAddressId" AS "allocator",
  count(*)::int AS "num_of_allocations",
  sum(
    "allowance"
  )::bigint AS "sum_of_allocations"
FROM
  "verified_client_allowance"
WHERE
  "height" >= 3698160 -- current fil+ edition start
GROUP BY
  "week",
  "client",
  "allocator";
