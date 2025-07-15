select "id"                                     as "id",
       "addressId"                              as "client_id",
       "verifierAddressId"                      as "allocator_id",
       "allowance"                              as "allocation",
       to_timestamp("height" * 30 + 1598306400) as "timestamp"
from "verified_client_allowance"
where "height" >= 3698160; -- current fil+ edition start
