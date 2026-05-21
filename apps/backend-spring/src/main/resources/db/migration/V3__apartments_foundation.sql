create table apartments (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    name varchar(120) not null,
    timezone varchar(120) not null,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint apartments_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade
);

create index apartments_organization_id_idx on apartments(organization_id);

create table apartment_memberships (
    id varchar(64) primary key,
    apartment_id varchar(64) not null,
    user_id varchar(64) not null,
    role varchar(32) not null,
    can_view boolean not null default true,
    can_update_task_status boolean not null default false,
    can_manage_integrations boolean not null default false,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint apartment_memberships_apartment_fk
        foreign key (apartment_id) references apartments(id) on delete cascade,
    constraint apartment_memberships_user_fk
        foreign key (user_id) references users(id) on delete cascade,
    constraint apartment_memberships_unique unique (apartment_id, user_id),
    constraint apartment_memberships_role_check
        check (role in ('host_admin', 'co_host', 'team'))
);

create index apartment_memberships_user_id_idx on apartment_memberships(user_id);
