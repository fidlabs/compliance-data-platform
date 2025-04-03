with

providers as (
  select distinct provider from providers_weekly
),

latest_updates as (
  select provider, max(date) as latest_update from provider_ip_info group by provider
)

select
  provider
from providers
left join latest_updates using (provider)
where latest_update is null or latest_update < now() - interval '1 week';
