create table reservations (
    id varchar(64) primary key,
    apartment_id varchar(64) not null,
    ical_source_id varchar(64) not null,
    external_event_key varchar(255) not null,
    external_uid varchar(255),
    status varchar(32) not null default 'confirmed',
    guest_name varchar(120),
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    raw_summary varchar(255),
    raw_payload text,
    last_seen_in_feed_at timestamp with time zone,
    missing_in_feed_count integer not null default 0,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint reservations_apartment_fk
        foreign key (apartment_id) references apartments(id) on delete cascade,
    constraint reservations_ical_source_fk
        foreign key (ical_source_id) references ical_sources(id) on delete cascade,
    constraint reservations_source_event_unique
        unique (ical_source_id, external_event_key),
    constraint reservations_status_check
        check (status in ('confirmed', 'cancelled', 'missing_in_feed'))
);

create index reservations_apartment_window_idx
    on reservations(apartment_id, starts_at, ends_at);

create index reservations_status_idx on reservations(status);

create table sync_runs (
    id varchar(64) primary key,
    ical_source_id varchar(64) not null,
    status varchar(32) not null,
    started_at timestamp with time zone not null default current_timestamp,
    finished_at timestamp with time zone,
    events_seen integer not null default 0,
    reservations_upserted integer not null default 0,
    error_message varchar(255),
    constraint sync_runs_ical_source_fk
        foreign key (ical_source_id) references ical_sources(id) on delete cascade,
    constraint sync_runs_status_check
        check (status in ('running', 'succeeded', 'failed', 'skipped'))
);

create index sync_runs_ical_source_started_at_idx
    on sync_runs(ical_source_id, started_at);
