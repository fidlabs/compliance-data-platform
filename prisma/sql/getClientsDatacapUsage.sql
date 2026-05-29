SELECT
	client AS client_id,
	COALESCE(
		SUM(total_deal_size) FILTER (
			WHERE "hour" >= timezone('UTC', NOW()) - INTERVAL '2 weeks'
		),
		0
	) AS dc_used_2_weeks,
	COALESCE(
		SUM(total_deal_size) FILTER (
			WHERE "hour" >= timezone('UTC', NOW()) - INTERVAL '90 days'
		),
		0
	) AS dc_used_90_days
FROM client_claims_hourly
GROUP BY client