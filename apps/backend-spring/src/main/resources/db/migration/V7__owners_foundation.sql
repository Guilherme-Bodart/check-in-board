create table owners (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    name varchar(160) not null,
    type varchar(32) not null,
    contact_name varchar(160),
    email varchar(180),
    phone varchar(60),
    notes varchar(2000),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint owners_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade,
    constraint owners_type_check
        check (type in ('internal', 'client'))
);

create index owners_organization_id_idx on owners(organization_id);
create index owners_organization_type_idx on owners(organization_id, type);

insert into owners (
    id,
    organization_id,
    name,
    type
)
select
    'owner-' || organizations.id,
    organizations.id,
    organizations.name || ' - Imoveis proprios',
    'internal'
from organizations
where organizations.deleted_at is null;

alter table apartments add column owner_id varchar(64);

update apartments
set owner_id = 'owner-' || organization_id
where owner_id is null;

alter table apartments alter column owner_id set not null;

alter table apartments
    add constraint apartments_owner_fk
        foreign key (owner_id) references owners(id);

create index apartments_owner_id_idx on apartments(owner_id);
