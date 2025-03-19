select avg("avg_weighted_retrievability_success_rate") as "average"
from "allocators_weekly_acc"
         left join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
where "allocator"."is_metaallocator" != true
  and "week" = $1;
