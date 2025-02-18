select
    date_trunc('week', to_timestamp(height * 30 + 1598306400)) as week,
    "addressId" as client,
    "verifierAddressId" as allocator,
    count(*)::int as num_of_allocations,
    sum(allowance)::float as sum_of_allocations
from verified_client_allowance
where height >= 3847920 -- nv22 start
group by
    week,
    client,
    allocator;