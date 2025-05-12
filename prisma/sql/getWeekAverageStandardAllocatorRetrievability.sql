select avg("avg_weighted_retrievability_success_rate") as "average"
from "allocators_weekly"
         left join "allocator" on "allocators_weekly"."allocator" = "allocator"."id"
where "allocator"."is_metaallocator" = false or "allocator"."is_metaallocator" is null
  and "week" = $1;
