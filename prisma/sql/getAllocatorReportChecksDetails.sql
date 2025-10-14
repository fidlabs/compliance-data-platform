-- @param {DateTime} $1:day
WITH
  "today" AS (
    SELECT
      "report"."allocator" AS "allocatorId",
      "report"."name" AS "allocatorName",
      (
        count(
          DISTINCT "check_result"."check"
        ) FILTER (
          WHERE
            "check_result"."result" = TRUE
        )
      )::int AS "checksPassedCount",
      (
        count(
          DISTINCT "check_result"."check"
        ) FILTER (
          WHERE
            "check_result"."result" = FALSE
        )
      )::int AS "checksFailedCount",
      coalesce(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'reportId',
            "check_result"."allocator_report_id",
            'reportCreateDate',
            "report"."create_date",
            'check',
            "check_result"."check",
            'checkMsg',
            "check_result"."metadata"::jsonb -> 'msg',
            'firstSeen',
            coalesce(
              "check_history"."firstSeen",
              "report"."create_date"
            ),
            'lastSeen',
            "check_history"."lastSeen",
            'lastPassed',
            "check_history"."lastPassed",
            'isNewWeekly',
            coalesce(
              "check_history"."lastSeen" < "report"."create_date" - interval '7 days',
              TRUE
            ),
            'isNewDaily',
            coalesce(
              "check_history"."lastSeen" < "report"."create_date" - interval '36 hours',
              TRUE
            )
          )
        ) FILTER (
          WHERE
            "check_result"."result" = FALSE
        ),
        '[]'::jsonb
      ) AS "failedChecks"
      --
    FROM
      "allocator_report_check_result" "check_result"
      JOIN "allocator_report" "report" ON "check_result"."allocator_report_id" = "report"."id"
      --
      LEFT JOIN LATERAL (
        SELECT
          min(
            "report_history"."create_date"
          ) FILTER (
            WHERE
              "check_result_history"."result" = FALSE
          ) AS "firstSeen",
          max(
            "report_history"."create_date"
          ) FILTER (
            WHERE
              "check_result_history"."result" = FALSE
          ) AS "lastSeen",
          max(
            "report_history"."create_date"
          ) FILTER (
            WHERE
              "check_result_history"."result" = TRUE
          ) AS "lastPassed"
        FROM
          "allocator_report_check_result" "check_result_history"
          JOIN "allocator_report" "report_history" ON "check_result_history"."allocator_report_id" = "report_history"."id"
        WHERE
          "check_result_history"."check" = "check_result"."check"
          AND "report_history"."allocator" = "report"."allocator"
          AND date_trunc(
            'day',
            "report_history"."create_date"
          ) < date_trunc(
            'day',
            $1::timestamp
          )
      ) AS "check_history" ON TRUE
      --
    WHERE
      date_trunc(
        'day',
        "check_result"."create_date"
      ) = date_trunc(
        'day',
        $1::timestamp
      )
    GROUP BY
      "report"."allocator",
      "report"."name"
  ),
  --
  "yesterday" AS (
    SELECT
      "report"."allocator" AS "allocatorId",
      (
        count(
          DISTINCT "check_result"."check"
        ) FILTER (
          WHERE
            "check_result"."result" = TRUE
        )
      )::int AS "checksPassedCount",
      (
        count(
          DISTINCT "check_result"."check"
        ) FILTER (
          WHERE
            "check_result"."result" = FALSE
        )
      )::int AS "checksFailedCount"
    FROM
      "allocator_report_check_result" "check_result"
      JOIN "allocator_report" "report" ON "check_result"."allocator_report_id" = "report"."id"
    WHERE
      date_trunc(
        'day',
        "check_result"."create_date"
      ) = date_trunc(
        'day',
        $1::timestamp
      ) - interval '1 day'
    GROUP BY
      "allocatorId"
  )
  --
SELECT
  "today".*,
  CASE
    WHEN "yesterday"."checksPassedCount" IS NOT NULL THEN (
      "today"."checksPassedCount" - "yesterday"."checksPassedCount"
    )
  END AS "checksPassedChange",
  CASE
    WHEN "yesterday"."checksFailedCount" IS NOT NULL THEN (
      "today"."checksFailedCount" - "yesterday"."checksFailedCount"
    )
  END AS "checksFailedChange"
FROM
  "today"
  LEFT JOIN "yesterday" ON "today"."allocatorId" = "yesterday"."allocatorId";
