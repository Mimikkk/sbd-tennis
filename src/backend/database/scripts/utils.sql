﻿-- Show all connections names
SELECT con.*
FROM pg_catalog.pg_constraint con
       INNER JOIN pg_catalog.pg_class rel
                  ON rel.oid = con.conrelid
       INNER JOIN pg_catalog.pg_namespace nsp
                  ON nsp.oid = connamespace
WHERE nsp.nspname = 'public';

-- Show all table names
select table_name
from information_schema.tables
where table_schema = 'public';

-- Show connections
SELECT client_addr, count(*)
FROM pg_stat_activity
WHERE client_addr is not null
GROUP BY client_addr;

