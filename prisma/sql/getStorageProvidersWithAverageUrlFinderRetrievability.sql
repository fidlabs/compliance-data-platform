WITH "retrievability" AS
  (SELECT DISTINCT ON ("provider") "provider",
                      "success_rate" as "current_url_finder_retrievability",
                      AVG(COALESCE("success_rate", 0)) OVER (PARTITION BY "provider") AS "30_day_average_url_finder_retrievability"
   FROM "provider_url_finder_retrievability_daily"
   WHERE "date" >= DATE_TRUNC('day', CURRENT_TIMESTAMP) - '30 days'::INTERVAL
   ORDER BY "provider",
            "date" DESC) --

SELECT "provider"."id" AS "provider",
       "provider"."num_of_deals" AS "noOfVerifiedDeals",
       "provider"."total_deal_size" AS "verifiedDealsTotalSize",
       "provider"."num_of_clients" AS "noOfClients",
       "provider"."last_deal_height" AS "lastDealHeight",
       "retrievability"."current_url_finder_retrievability" AS "urlFinderRetrievability",
       COALESCE("retrievability"."30_day_average_url_finder_retrievability", 0) AS "urlFinderRetrievability30DayAverage"
FROM "provider"
LEFT JOIN "retrievability" ON "provider"."id" = "retrievability"."provider"