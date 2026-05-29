SELECT SUM(v."initialAllowance") as total_allocators_datacap
FROM verifier v
WHERE v."createdAtHeight" >= 3698160 
	AND v."isMetaAllocator" = FALSE
	AND v."addressId" NOT IN ('f01940930','f03018491','f01858410', 'f02049625')