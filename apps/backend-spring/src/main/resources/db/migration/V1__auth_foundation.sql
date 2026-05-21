create table users (
    id varchar(64) primary key,
    auth_provider varchar(64) not null,
    auth_subject varchar(255) not null,
    full_name varchar(120) not null,
    email varchar(255) not null,
    password_hash varchar(255),
    phone varchar(64),
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint users_auth_provider_subject_unique unique (auth_provider, auth_subject),
    constraint users_email_unique unique (email)
);

create table organizations (
    id varchar(64) primary key,
    name varchar(120) not null,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp
);

create table organization_memberships (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    user_id varchar(64) not null,
    role varchar(32) not null,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint organization_memberships_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade,
    constraint organization_memberships_user_fk
        foreign key (user_id) references users(id) on delete cascade,
    constraint organization_memberships_unique unique (organization_id, user_id),
    constraint organization_memberships_role_check
        check (role in ('host_admin', 'co_host', 'team'))
);

create index organization_memberships_user_id_idx on organization_memberships(user_id);
