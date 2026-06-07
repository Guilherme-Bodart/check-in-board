create table settlement_periods (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    apartment_id varchar(64) not null,
    owner_id varchar(64) not null,
    period_month varchar(7) not null,
    status varchar(32) not null,
    paid_at timestamp with time zone,
    notes varchar(1000),
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint settlement_periods_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade,
    constraint settlement_periods_apartment_fk
        foreign key (apartment_id) references apartments(id),
    constraint settlement_periods_owner_fk
        foreign key (owner_id) references owners(id),
    constraint settlement_periods_status_check
        check (status in ('pending', 'paid')),
    constraint settlement_periods_unique
        unique (organization_id, apartment_id, owner_id, period_month)
);

create index settlement_periods_organization_month_idx
    on settlement_periods(organization_id, period_month);
