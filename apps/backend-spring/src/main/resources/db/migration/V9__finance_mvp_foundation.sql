alter table apartments
    add column management_commission_bps integer not null default 0;

alter table apartments
    add constraint apartments_management_commission_bps_check
        check (management_commission_bps >= 0 and management_commission_bps <= 10000);
