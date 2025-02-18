with miner_pieces as (
    select
        date_trunc('week', to_timestamp("termStart" * 30 + 1598306400)) as week,
        'f0' || "clientId"  as client,
        'f0' || "providerId"  as provider,
        "pieceCid",
        sum("pieceSize") as total_deal_size,
        min("pieceSize") as piece_size
    from unified_verified_deal
    where
        "termStart" >= 3847920 -- nv22 start
        and to_timestamp("termStart" * 30 + 1598306400) <= current_timestamp -- deals that didn't start yet
    group by
        week,
        client,
        provider,
        "pieceCid"
)
select
    week,
    client,
    provider,
    sum(total_deal_size)::float as total_deal_size,
    sum(piece_size)::float      as unique_data_size
from  miner_pieces
group by
    week,
    client,
    provider;
