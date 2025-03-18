select count(distinct "allocators_weekly_acc"."allocator")::int as "count"
from "allocators_weekly_acc"
         join "allocator" on "allocators_weekly_acc"."allocator" = "allocator"."id"
where "allocator"."is_metaallocator" = false;
