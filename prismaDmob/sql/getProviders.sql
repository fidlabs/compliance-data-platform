WITH miner_info AS (
	SELECT
		"providerId" AS "provider",
		COUNT(*) AS num_of_deals,
		"clientId" AS client,
		COALESCE(SUM("pieceSize"), 0) AS total_deal_size,
		COALESCE(MAX("termStart"), 0) AS last_deal_height,
		COALESCE(MIN("termStart"), 0) AS first_deal_height
	FROM unified_verified_deal
	WHERE "sectorId" <> '0'
	GROUP BY "clientId", "providerId"
)

SELECT
	'f0' || up."providerId" AS "id",
	COALESCE(SUM(mi.num_of_deals), 0)::INT AS num_of_deals,
	COALESCE(SUM(mi.total_deal_size), 0)::BIGINT AS total_deal_size,
	COUNT(mi.client)::INT AS num_of_clients,
	COALESCE(MAX(mi.last_deal_height), 0)::INT AS last_deal_height,
	COALESCE(MIN(mi.first_deal_height), 0)::INT AS first_deal_height
FROM unique_providers up
LEFT JOIN miner_info mi
	ON up."providerId" = mi.provider
WHERE up."providerId" IS NOT NULL
GROUP BY up."providerId";