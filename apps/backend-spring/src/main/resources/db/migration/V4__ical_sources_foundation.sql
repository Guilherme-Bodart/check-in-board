create table ical_sources (
    id varchar(64) primary key,
    apartment_id varchar(64) not null,
    provider varchar(80) not null,
    label varchar(120) not null,
    ical_url_encrypted text not null,
    sync_enabled boolean not null default true,
    etag varchar(255),
    last_modified_at timestamp with time zone,
    last_success_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint ical_sources_apartment_fk
        foreign key (apartment_id) references apartments(id) on delete cascade
);

create index ical_sources_apartment_sync_enabled_idx
    on ical_sources(apartment_id, sync_enabled);
