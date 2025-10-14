-- @param {Boolean} $1:showInactive
-- @param {Boolean} $2:isMetaallocator?
-- @param {String} $3:filter?
-- @param {String} $4:usingMetaallocatorId?
WITH
  "allocator_using_metaallocator" AS (
    SELECT
      *
    FROM
      "verifier"
    WHERE
      "verifier"."isVirtual" = TRUE
  ),
  "metaallocator" AS (
    SELECT
      *
    FROM
      "verifier"
    WHERE
      "isMetaAllocator" = TRUE
  )
SELECT
  "verifier"."addressId" AS "addressId",
  "verifier"."address" AS "address",
  CASE
    WHEN "verifier"."auditTrail" = 'n/a' THEN NULL
    ELSE "verifier"."auditTrail"
  END AS "auditTrail",
  "verifier"."retries" AS "retries",
  CASE
    WHEN "verifier"."name" = 'n/a' THEN NULL
    ELSE trim(
      "verifier"."name"
    )
  END AS "name",
  CASE
    WHEN "verifier"."orgName" = 'n/a' THEN NULL
    ELSE trim(
      "verifier"."orgName"
    )
  END AS "orgName",
  "verifier"."removed" AS "removed",
  "verifier"."initialAllowance" AS "initialAllowance",
  "verifier"."allowance"::text AS "allowance",
  "verifier"."inffered" AS "inffered",
  "verifier"."isMultisig" AS "isMultisig",
  "verifier"."createdAtHeight" AS "createdAtHeight",
  "verifier"."issueCreateTimestamp" AS "issueCreateTimestamp",
  "verifier"."createMessageTimestamp" AS "createMessageTimestamp",
  "verifier"."initialAllowance" - "verifier"."allowance" AS "remainingDatacap",
  (
    SELECT
      count(
        DISTINCT "verified_client"."id"
      )::int
    FROM
      "verified_client"
    WHERE
      "verified_client"."verifierAddressId" = "verifier"."addressId"
  ) AS "verifiedClientsCount",
  coalesce(
    sum(
      "verifier_allowance"."allowance"
    ) FILTER (
      WHERE
        "verifier_allowance"."createMessageTimestamp" > extract(
          epoch
          FROM
            (
              now() - interval '14 days'
            )
        )
    ),
    0
  ) AS "receivedDatacapChange",
  coalesce(
    sum(
      "verifier_allowance"."allowance"
    ) FILTER (
      WHERE
        "verifier_allowance"."createMessageTimestamp" > extract(
          epoch
          FROM
            (
              now() - interval '90 days'
            )
        )
    ),
    0
  ) AS "receivedDatacapChange90Days",
  "verifier"."addressEth" AS "addressEth",
  CASE
    WHEN "verifier"."dcSource" = 'f080' THEN NULL
    ELSE "verifier"."dcSource"
  END AS "dcSource",
  "verifier"."isVirtual" AS "isVirtual",
  "verifier"."isMetaAllocator" AS "isMetaAllocator",
  sum(
    "verifier_allowance"."allowance"
  ) FILTER (
    WHERE
      "verifier_allowance"."dcSource" != 'f080'
      AND upper(
        "verifier_allowance"."dcSource"
      ) = upper(
        "metaallocator"."addressEth"
      )
  ) AS "receivedDatacapFromMetaallocator",
  coalesce(
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'error',
        CASE
          WHEN "verifier_allowance"."error" = '' THEN NULL
          ELSE "verifier_allowance"."error"
        END,
        'height',
        "verifier_allowance"."height",
        'msgCID',
        "verifier_allowance"."msgCID",
        'retries',
        "verifier_allowance"."retries",
        'dcSource',
        CASE
          WHEN "verifier_allowance"."dcSource" = 'f080' THEN NULL
          ELSE "verifier_allowance"."dcSource"
        END,
        'allowance',
        "verifier_allowance"."allowance"::text,
        'isVirtual',
        "verifier_allowance"."isVirtual",
        'auditTrail',
        CASE
          WHEN "verifier_allowance"."auditTrail" = 'n/a' THEN NULL
          ELSE "verifier_allowance"."auditTrail"
        END,
        'auditStatus',
        "verifier_allowance"."auditStatus",
        'issueCreateTimestamp',
        "verifier_allowance"."issueCreateTimestamp",
        'createMessageTimestamp',
        "verifier_allowance"."createMessageTimestamp"
      )
    ),
    '[]'::jsonb
  ) AS "allowanceArray",
  CASE
    WHEN "verifier"."isMetaAllocator" = FALSE THEN NULL
    ELSE coalesce(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'addressId',
          "allocator_using_metaallocator"."addressId",
          'address',
          "allocator_using_metaallocator"."address",
          'dcSource',
          "allocator_using_metaallocator"."dcSource"
        )
      ) FILTER (
        WHERE
          "allocator_using_metaallocator"."addressId" IS NOT NULL
      ),
      '[]'::jsonb
    )
  END AS "allocatorsUsingMetaallocator",
  CASE
    WHEN "verifier"."isVirtual" = FALSE THEN NULL
    ELSE coalesce(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'addressId',
          "metaallocator"."addressId",
          'addressEth',
          "metaallocator"."addressEth",
          'address',
          "metaallocator"."address"
        )
      ),
      '[]'::jsonb
    )
  END AS "metaallocators",
  coalesce(
    (
      SELECT
        "auditStatus"
      FROM
        "verifier_allowance"
      WHERE
        "verifierId" = "verifier"."id"
        AND "auditStatus" != 'notAudited'
      ORDER BY
        "height" DESC
      LIMIT
        1
    ),
    (
      SELECT
        "auditStatus"
      FROM
        "verifier_allowance"
      WHERE
        "verifierId" = "verifier"."id"
      ORDER BY
        "height" DESC
      LIMIT
        1
    )
  ) AS "auditStatus"
FROM
  "verifier"
  LEFT JOIN "allocator_using_metaallocator" ON upper(
    "verifier"."addressEth"
  ) = upper(
    "allocator_using_metaallocator"."dcSource"
  )
  LEFT JOIN "metaallocator" ON upper(
    "verifier"."dcSource"
  ) = upper(
    "metaallocator"."addressEth"
  )
  LEFT JOIN "verifier_allowance" ON "verifier"."id" = "verifier_allowance"."verifierId"
WHERE
  (
    $1
    OR "verifier"."createdAtHeight" > 3698160
  ) -- current fil+ edition start
  AND (
    "verifier"."isMetaAllocator" = $2
    OR $2 IS NULL
  )
  AND (
    $3 = ''
    OR $3 IS NULL
    OR upper(
      "verifier"."address"
    ) = upper($3)
    OR upper(
      "verifier"."addressId"
    ) = upper($3)
    OR upper(
      "verifier"."name"
    ) LIKE upper(
      '%' || $3 || '%'
    )
    OR upper(
      "verifier"."orgName"
    ) LIKE upper(
      '%' || $3 || '%'
    )
  )
  AND (
    upper(
      "metaallocator"."addressId"
    ) = upper($4)
    OR $4 IS NULL
  )
GROUP BY
  "verifier"."id";
