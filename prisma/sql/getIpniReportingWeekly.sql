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

select
    week,
    last_value(ok) over w as ok,
    last_value(not_reporting) over w as not_reporting,
    last_value(misreporting) over w as misreporting,
    last_value(total) over w as total
from with_week
window w as (partition by week order by date asc);
