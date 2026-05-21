package com.checkinboard.backend.modules.auth.service;

import org.springframework.http.HttpStatus;

public class AuthServiceException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public AuthServiceException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
