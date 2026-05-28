-- @param {String}  $1:intervalUnit Unit for creating windows, eg. day or week, must be valid PGSQL interval unit

SELECT
    allocator.id as allocator_id,
    COALESCE(allocator.name, allocator.id, 'N/A') as allocator_name,
    date_trunc(
        $1,
        timezone(
            'UTC',
            cda.timestamp
        )
    )::DATE AS window_start,
    SUM(cda.allocation) AS window_total
FROM client_datacap_allocation cda
JOIN allocator
    ON allocator.id = cda.allocator_id
WHERE
    allocator.id NOT IN ('f01940930','f03018491','f01858410', 'f02049625')
GROUP BY window_start, allocator.id
ORDER BY window_start ASC, window_total DESC