-- @param {Boolean} $1:showInactive
-- @param {DateTime} $2:cutoffDate
SELECT
  "verifier_allowance"."addressId" AS "allocatorId",
  sum(
    "verifier_allowance"."allowance"
  )::bigint AS "datacap",
  CASE
    WHEN "verifier"."name" = 'n/a' THEN NULL
    ELSE trim(
      "verifier"."name"
    )
  END AS "allocatorName"
FROM
  "verifier_allowance"
  JOIN "verifier" ON "verifier_allowance"."verifierId" = "verifier"."id"
WHERE
  (
    $1
    OR "verifier"."createdAtHeight" > 3698160
  ) -- current fil+ edition start
  AND (
    to_timestamp(
      "height" * 30 + 1598306400
    ) <= $2
    OR $2 IS NULL
  ) -- allocations up to provided date
GROUP BY
  "verifier_allowance"."addressId",
  "verifier"."name";
