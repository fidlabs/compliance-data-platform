
alter table client_address_mapping rename to id_address_mapping;
alter table id_address_mapping rename client to id;
alter index client_address_mapping_pkey rename to id_address_mapping_pkey;
alter index client_address_mapping_address_key rename to id_address_mapping_address_key;
