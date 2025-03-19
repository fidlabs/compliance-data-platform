select avg("avg_weighted_retrievability_success_rate") as "average"
from "allocators_weekly"
         join "allocator" on "allocators_weekly"."allocator" = "allocator"."id"
where "allocator"."is_metaallocator" = false
  and "week" = $1;
