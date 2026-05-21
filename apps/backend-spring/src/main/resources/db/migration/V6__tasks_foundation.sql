create table tasks (
    id varchar(64) primary key,
    apartment_id varchar(64) not null,
    reservation_id varchar(64),
    title varchar(160) not null,
    description varchar(500),
    status varchar(32) not null default 'pending',
    status_note varchar(500),
    due_at timestamp with time zone not null,
    completed_at timestamp with time zone,
    completed_by_user_id varchar(64),
    assigned_user_id varchar(64),
    created_by_user_id varchar(64) not null,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint tasks_apartment_fk
        foreign key (apartment_id) references apartments(id) on delete cascade,
    constraint tasks_reservation_fk
        foreign key (reservation_id) references reservations(id) on delete set null,
    constraint tasks_completed_by_user_fk
        foreign key (completed_by_user_id) references users(id) on delete set null,
    constraint tasks_assigned_user_fk
        foreign key (assigned_user_id) references users(id) on delete set null,
    constraint tasks_created_by_user_fk
        foreign key (created_by_user_id) references users(id) on delete restrict,
    constraint tasks_status_check
        check (status in ('pending', 'done', 'not_done', 'cancelled'))
);

create index tasks_apartment_due_at_idx on tasks(apartment_id, due_at);
create index tasks_status_due_at_idx on tasks(status, due_at);
create index tasks_reservation_idx on tasks(reservation_id);
