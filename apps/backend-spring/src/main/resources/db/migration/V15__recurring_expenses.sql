create table recurring_expenses (
    id varchar(64) primary key,
    organization_id varchar(64) not null,
    apartment_id varchar(64) not null,
    title varchar(160) not null,
    category varchar(80) not null,
    amount_cents bigint not null,
    day_of_month integer not null default 5,
    notes varchar(500),
    active boolean not null default true,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    updated_at timestamp with time zone not null default current_timestamp,
    constraint recurring_expenses_organization_fk
        foreign key (organization_id) references organizations(id) on delete cascade,
    constraint recurring_expenses_apartment_fk
        foreign key (apartment_id) references apartments(id) on delete cascade,
    constraint recurring_expenses_amount_positive_check
        check (amount_cents > 0),
    constraint recurring_expenses_day_of_month_check
        check (day_of_month >= 1 and day_of_month <= 28)
);

create index recurring_expenses_apartment_idx
    on recurring_expenses(apartment_id);

create table recurring_expense_applications (
    id varchar(64) primary key,
    recurring_expense_id varchar(64) not null,
    financial_entry_id varchar(64) not null,
    applied_month varchar(7) not null,
    created_at timestamp with time zone not null default current_timestamp,
    constraint uq_recurring_app_month
        unique (recurring_expense_id, applied_month),
    constraint recurring_expense_applications_expense_fk
        foreign key (recurring_expense_id) references recurring_expenses(id) on delete cascade,
    constraint recurring_expense_applications_entry_fk
        foreign key (financial_entry_id) references financial_entries(id) on delete cascade
);

create index recurring_expense_applications_expense_month_idx
    on recurring_expense_applications(recurring_expense_id, applied_month);
