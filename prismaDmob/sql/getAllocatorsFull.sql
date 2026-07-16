-- @param {Boolean} $1:showInactive
-- @param {Boolean} $2:isMetaallocator?
-- @param {String} $3:filter?
-- @param {String} $4:usingMetaallocatorId?

WITH allocator_using_metaallocator AS (
	SELECT
		UPPER("dcSource") AS upper_dc_source,
		JSONB_AGG(
			JSONB_BUILD_OBJECT(
				'addressId', "addressId",
				'address', "address",
				'dcSource', "dcSource"
			)
		) AS allocators_json
	FROM verifier
	WHERE "isVirtual" = true
	GROUP BY 1
),

metaallocators AS (
	SELECT
		UPPER("addressEth") AS upper_address_eth,
		UPPER("addressId") AS upper_address_id,
		JSONB_AGG(
			JSONB_BUILD_OBJECT(
				'addressId', "addressId",
				'addressEth', "addressEth",
				'address', "address"
			)
		) AS metaallocators_json
	FROM verifier
	WHERE "isMetaAllocator" = true
	GROUP BY 1, 2
),

va_aggregated AS (
	SELECT
		"verifierId",
		COALESCE(
			SUM("allowance") FILTER (
				WHERE "createMessageTimestamp" > 
					EXTRACT(EPOCH FROM (NOW() - INTERVAL '14 days'))
			),
			0
		) AS "receivedDatacapChange",
		COALESCE(
			SUM("allowance") FILTER (
				WHERE "createMessageTimestamp" > 
					EXTRACT(EPOCH FROM (NOW() - INTERVAL '90 days'))
			),
			0
		) AS "receivedDatacapChange90Days",
		COALESCE(
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'error', NULLIF("error", ''),
                    'height', "height",
                    'msgCID', "msgCID",
                    'retries', "retries",
                    'dcSource', NULLIF("dcSource", 'f080'),
                    'allowance', "allowance"::TEXT,
                    'isVirtual', "isVirtual",
                    'auditTrail', NULLIF("auditTrail", 'n/a'),
                    'auditStatus', "auditStatus",
                    'issueCreateTimestamp', "issueCreateTimestamp",
                    'createMessageTimestamp', "createMessageTimestamp"
                )
            ),
			'[]'::JSONB
        ) AS "allowanceArray"
	FROM verifier_allowance
	GROUP BY "verifierId"
),

latest_client_allocations AS (
	SELECT
		"verifierAddressId",
		MAX(height) AS "latestClientAllocationHeight"
	FROM verified_client_allowance
	GROUP BY "verifierAddressId"
)

SELECT
	v."addressId",
	v.address,
	NULLIF(v."auditTrail", 'n/a') AS "auditTrail",
	v."retries",
	NULLIF(TRIM(v.name), '') AS "name",
	NULLIF(TRIM(v."orgName"), '') AS "orgName",
	v.removed,
	v."initialAllowance",
	v.allowance::TEXT AS allowance,
	v.inffered,
	v."isMultisig",
	v."createdAtHeight",
	v."issueCreateTimestamp",
	v."createMessageTimestamp",
	v.allowance AS "remainingDatacap",

	-- Correlated subquery for counting verified clients
	(
		SELECT COUNT (DISTINCT vc.id)::INT
		FROM verified_client vc
		WHERE vc."verifierAddressId" = v."addressId"
	) AS "verifiedClientsCount",

	COALESCE(va."receivedDatacapChange", 0) AS "receivedDatacapChange",
	COALESCE(va."receivedDatacapChange90Days", 0)
		AS "receivedDatacapChange90Days",
	v."addressEth",
	NULLIF(v."dcSource", 'f080') AS "dcSource",
	v."isVirtual",
	v."isMetaAllocator",

	(
		SELECT SUM(va_sub.allowance)
		FROM verifier_allowance va_sub
		WHERE va_sub."verifierId" = v.id
			AND va_sub."dcSource" != 'f080'
			AND UPPER(va_sub."dcSource") = m.upper_address_eth
	) AS "receivedDatacapFromMetaallocator",

	COALESCE(va."allowanceArray", '[]'::JSONB) AS "allowanceArray",
	CASE
		WHEN v."isMetaAllocator" = FALSE THEN NULL
		ELSE COALESCE(aum.allocators_json, '[]'::JSONB)
	END AS "allocatorsUsingMetaallocator",
	CASE
		WHEN v."isVirtual" = FALSE THEN NULL
		ELSE COALESCE(m.metaallocators_json, '[]'::JSONB)
	END AS metaallocators,
	COALESCE(
		(
			SELECT "auditStatus"
			FROM verifier_allowance
			WHERE "verifierId" = v.id
			AND "auditStatus" != 'notAudited'
			ORDER BY height DESC
			LIMIT 1
		),
		(
			SELECT "auditStatus"
			FROM verifier_allowance
			WHERE "verifierId" = v.id
			ORDER BY height DESC LIMIT 1
		)
	) AS "auditStatus",
	lca."latestClientAllocationHeight"
FROM verifier v
LEFT JOIN allocator_using_metaallocator aum 
	ON UPPER(v."addressEth") = aum.upper_dc_source
LEFT JOIN metaallocators m
	ON UPPER(v."dcSource") = m.upper_address_eth
LEFT JOIN va_aggregated va
	ON v.id = va."verifierId"
LEFT JOIN latest_client_allocations lca
	ON v."addressId" = lca."verifierAddressId"
WHERE ($1 OR v."createdAtHeight" > 3698160)
	AND (v."isMetaAllocator" = $2 OR $2 IS NULL)
	AND (
		$3 = ''
		OR $3 IS NULL
		OR UPPER(v.address) = UPPER($3)
		OR UPPER(v."addressId") = UPPER($3)
		OR UPPER(v.name) LIKE UPPER('%' || $3 || '%')
		OR UPPER(v."orgName") LIKE UPPER('%' || $3 || '%')
	)
	AND (m.upper_address_id = UPPER($4) OR $4 IS NULL);