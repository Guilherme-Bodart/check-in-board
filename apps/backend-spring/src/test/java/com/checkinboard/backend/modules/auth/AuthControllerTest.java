package com.checkinboard.backend.modules.auth;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.checkinboard.backend.BackendSpringApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = BackendSpringApplication.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from organization_memberships");
        jdbcTemplate.update("delete from organizations");
        jdbcTemplate.update("delete from users");
    }

    @Test
    void createsAndSignsInWithEmailAndPassword() throws Exception {
        mockMvc
            .perform(
                post("/auth/sign-up")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "fullName": "Host Admin",
                          "organizationName": "Host Ops",
                          "password": "secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.accessToken", notNullValue()))
            .andExpect(jsonPath("$.organization.name").value("Host Ops"))
            .andExpect(jsonPath("$.user.email").value("host@example.com"))
            .andExpect(jsonPath("$.user.fullName").value("Host Admin"));

        mockMvc
            .perform(
                post("/auth/sign-in")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "password": "secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", notNullValue()))
            .andExpect(jsonPath("$.user.email").value("host@example.com"));
    }

    @Test
    void rejectsDuplicatePasswordSignUp() throws Exception {
        signUpHost();

        mockMvc
            .perform(
                post("/auth/sign-up")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "fullName": "Host Admin",
                          "password": "secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_REGISTERED"))
            .andExpect(
                jsonPath("$.error.message").value(
                    "This email already has an account. Try signing in."
                )
            );
    }

    @Test
    void rejectsIncorrectPasswords() throws Exception {
        signUpHost();

        mockMvc
            .perform(
                post("/auth/sign-in")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "password": "wrong-password"
                        }
                        """
                    )
            )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"))
            .andExpect(jsonPath("$.error.message").value("Email or password is incorrect."));
    }

    @Test
    void returnsAuthenticatedUser() throws Exception {
        String accessToken = signUpHost();

        mockMvc
            .perform(get("/auth/me").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.email").value("host@example.com"))
            .andExpect(jsonPath("$.user.fullName").value("Host Admin"))
            .andExpect(jsonPath("$.memberships[0].role").value("host_admin"))
            .andExpect(jsonPath("$.memberships[0].isActive").value(true))
            .andExpect(jsonPath("$.memberships[0].organization.name").value("Host Ops"));
    }

    @Test
    void rejectsMeWithoutBearerToken() throws Exception {
        mockMvc
            .perform(get("/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.error.message").value("Authentication is required."));
    }

    @Test
    void rejectsInvalidPayloads() throws Exception {
        mockMvc
            .perform(
                post("/auth/sign-up")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "not-an-email",
                          "fullName": "",
                          "password": "short"
                        }
                        """
                    )
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    private String signUpHost() throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/auth/sign-up")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "fullName": "Host Admin",
                          "organizationName": "Host Ops",
                          "password": "secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isCreated())
            .andReturn();

        String response = result.getResponse().getContentAsString();
        int tokenStart = response.indexOf("\"accessToken\":\"") + "\"accessToken\":\"".length();
        int tokenEnd = response.indexOf('"', tokenStart);
        return response.substring(tokenStart, tokenEnd);
    }
}
