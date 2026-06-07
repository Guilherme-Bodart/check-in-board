alter table financial_entries
    add column rental_stay_id varchar(64);

alter table financial_entries
    add constraint financial_entries_rental_stay_fk
        foreign key (rental_stay_id) references rental_stays(id);

create index financial_entries_rental_stay_id_idx
    on financial_entries(rental_stay_id);
