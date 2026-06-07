create table rental_stays (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    apartment_id varchar(64) not null,
    owner_id varchar(64) not null,
    guest_name varchar(160),
    channel varchar(80),
    check_in date not null,
    check_out date not null,
    rent_amount_cents bigint not null,
    currency varchar(3) not null,
    notes varchar(1000),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint rental_stays_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade,
    constraint rental_stays_apartment_fk
        foreign key (apartment_id) references apartments(id),
    constraint rental_stays_owner_fk
        foreign key (owner_id) references owners(id),
    constraint rental_stays_amount_positive_check
        check (rent_amount_cents > 0),
    constraint rental_stays_date_order_check
        check (check_out > check_in)
);

create index rental_stays_organization_check_in_idx
    on rental_stays(organization_id, check_in);
create index rental_stays_apartment_check_in_idx
    on rental_stays(apartment_id, check_in);
create index rental_stays_owner_check_in_idx
    on rental_stays(owner_id, check_in);
