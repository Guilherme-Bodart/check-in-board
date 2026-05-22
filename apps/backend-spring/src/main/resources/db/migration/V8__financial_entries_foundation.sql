create table financial_entries (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    apartment_id varchar(64) not null,
    owner_id varchar(64) not null,
    type varchar(32) not null,
    category varchar(80) not null,
    description varchar(500),
    amount_cents bigint not null,
    currency varchar(3) not null,
    occurred_on date not null,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint financial_entries_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade,
    constraint financial_entries_apartment_fk
        foreign key (apartment_id) references apartments(id),
    constraint financial_entries_owner_fk
        foreign key (owner_id) references owners(id),
    constraint financial_entries_type_check
        check (type in ('revenue', 'expense')),
    constraint financial_entries_amount_positive_check
        check (amount_cents > 0)
);

create index financial_entries_organization_date_idx
    on financial_entries(organization_id, occurred_on);
create index financial_entries_apartment_date_idx
    on financial_entries(apartment_id, occurred_on);
create index financial_entries_owner_date_idx
    on financial_entries(owner_id, occurred_on);
