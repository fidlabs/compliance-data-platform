WITH --
"active_allocators" AS
        (SELECT "allocator_id"
         FROM "allocator_registry"
         WHERE "rejected" = FALSE
         UNION SELECT "allocator_id" AS "allocator_id"
         FROM "allocator_registry_archive"
         WHERE "rejected" = FALSE), --
 "allocator_client_deals_count" AS
        (SELECT "allocator_id",
                "client_id",
                COUNT(*) AS "deals_count"
         FROM "client_datacap_allocation"
         GROUP BY "allocator_id",
                  "client_id"),
 "allocator_clients_count" AS
        (SELECT "allocator_id",
                COUNT("client_id") AS "clients_count",
                COUNT("client_id") FILTER (
                                           WHERE "deals_count" > 1) AS "returning_clients_count"
         FROM "allocator_client_deals_count"
         GROUP BY "allocator_id"),
 "first_deal" AS
        (SELECT "client_id",
                "allocator_id",
                "timestamp" AS "allocation_timestamp",
                MIN("hour") FILTER (
                                    WHERE "hour" >= "timestamp") AS "first_deal_timestamp"
         FROM "client_datacap_allocation"
         LEFT JOIN "unified_verified_deal_hourly" ON "client_datacap_allocation"."client_id" = "unified_verified_deal_hourly"."client"
         GROUP BY "client_id",
                  "allocator_id",
                  "timestamp"),
 "allocation_seconds_to_first_deal" AS
        (SELECT "allocator_id",
                EXTRACT(epoch
                        FROM ("first_deal_timestamp" - "allocation_timestamp"))::INT AS "seconds_to_first_deal"
         FROM "first_deal") --

SELECT "active_allocators"."allocator_id",
       COALESCE("clients_count", 0) AS "number_of_clients",
       COALESCE("returning_clients_count"::DECIMAL / "clients_count", 0) AS "returning_clients_percentage",
       AVG("seconds_to_first_deal")::INT AS "average_seconds_to_first_deal"
FROM "active_allocators"
LEFT JOIN "allocator" ON "active_allocators"."allocator_id" = "allocator"."id"
LEFT JOIN "allocator_clients_count" ON "active_allocators"."allocator_id" = "allocator_clients_count"."allocator_id"
LEFT JOIN "allocation_seconds_to_first_deal" ON "active_allocators"."allocator_id" = "allocation_seconds_to_first_deal"."allocator_id"
WHERE "allocator"."is_metaallocator" = FALSE -- no metallocators
GROUP BY "active_allocators"."allocator_id",
         "clients_count",
         "returning_clients_percentage"