-- We generate client_provider_distribution_weekly_acc incrementally, without rewriting old data.
-- We're changing the cutoff date from April 22 to March 1, which will affect all data - so we need to clean up old data to regenerate.
truncate client_provider_distribution_weekly_acc;
