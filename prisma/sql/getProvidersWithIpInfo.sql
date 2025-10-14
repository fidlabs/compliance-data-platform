WITH
  "latest_updates" AS (
    SELECT
      "provider",
      max("date") AS "date"
    FROM
      "provider_ip_info"
    GROUP BY
      "provider"
  )
SELECT
  "provider",
  "lat",
  "long",
  "country",
  "region",
  "city"
FROM
  "provider_ip_info"
  INNER JOIN "latest_updates" USING (
    "provider",
    "date"
  );
