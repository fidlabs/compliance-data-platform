WITH
  "providers" AS (
    SELECT DISTINCT
      "provider"
    FROM
      "providers_weekly"
  ),
  "latest_updates" AS (
    SELECT
      "provider",
      max("date") AS "latest_update"
    FROM
      "provider_ip_info"
    GROUP BY
      "provider"
  )
SELECT
  "provider"
FROM
  "providers"
  LEFT JOIN "latest_updates" USING (
    "provider"
  )
WHERE
  "latest_update" IS NULL
  OR "latest_update" < now() - interval '1 week';
