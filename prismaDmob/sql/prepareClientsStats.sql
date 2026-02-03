WITH "clients_with_deals" AS
  (SELECT DISTINCT "clientId",
                   'f0' || "clientId" AS "addressId"
   FROM "dc_allocation_claim"
   WHERE TYPE <> 'allocation'),
     "allowances" AS
  (SELECT "addressId",
          "allowance"
   FROM "processed_data_for_verified_client"
   WHERE "addressId" <> ''
   GROUP BY "addressId",
            "allowance")
SELECT COUNT("clientId")::INT AS "clients_with_active_deals",
       (COUNT("clientId") FILTER (
                                  WHERE "allowance" > 0))::INT AS "clients_who_have_dc_and_deals",
       SUM("allowance")::BIGINT AS "total_remaining_datacap"
FROM "clients_with_deals"
LEFT JOIN "allowances" ON "allowances"."addressId" = "clients_with_deals"."addressId"