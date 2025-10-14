-- this may be a bit imprecise, if SP onboarded >1 client in the first hour of operation.
-- But boost in performance relative to using unified_verified_deal directly is worth it
SELECT DISTINCT
  ON (
    "provider"
  ) "provider" AS "provider",
  "client" AS "first_client"
FROM
  "unified_verified_deal_hourly"
ORDER BY
  "provider",
  "hour";
