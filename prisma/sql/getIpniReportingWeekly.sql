with with_week as (
    select
        date,
        ok,
        misreporting,
        not_reporting,
        total,
        date_trunc('week', date) as "week"
    from ipni_reporting_daily
)

select distinct on (week)
    week,
    ok,
    not_reporting,
    misreporting,
    total
from with_week
order by week, date desc;
