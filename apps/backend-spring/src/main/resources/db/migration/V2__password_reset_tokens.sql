create table password_reset_tokens (
    id varchar(64) primary key,
    user_id varchar(64) not null,
    token_hash varchar(64) not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone,
    created_at timestamp with time zone not null default current_timestamp,
    constraint password_reset_tokens_user_fk
        foreign key (user_id) references users(id) on delete cascade,
    constraint password_reset_tokens_token_hash_unique unique (token_hash)
);

create index password_reset_tokens_user_id_expires_at_idx
    on password_reset_tokens(user_id, expires_at);
