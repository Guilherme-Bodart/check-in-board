package com.checkinboard.backend.modules.auth;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.checkinboard.backend.BackendSpringApplication;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(
    classes = BackendSpringApplication.class,
    properties = "check-in-board.auth-password-reset-expose-token=true"
)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from password_reset_tokens");
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

    @Test
    void changesAuthenticatedUserPassword() throws Exception {
        String accessToken = signUpHost();

        mockMvc
            .perform(
                post("/auth/change-password")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "currentPassword": "secure-password",
                          "newPassword": "new-secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true));

        mockMvc
            .perform(
                post("/auth/sign-in")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "password": "new-secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", notNullValue()));
    }

    @Test
    void rejectsPasswordChangeWithWrongCurrentPassword() throws Exception {
        String accessToken = signUpHost();

        mockMvc
            .perform(
                post("/auth/change-password")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "currentPassword": "wrong-password",
                          "newPassword": "new-secure-password"
                        }
                        """
                    )
            )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"))
            .andExpect(jsonPath("$.error.message").value("Current password is incorrect."));
    }

    @Test
    void resetsPasswordWithSingleUseToken() throws Exception {
        signUpHost();

        String resetToken = requestPasswordResetToken("host@example.com");

        mockMvc
            .perform(
                post("/auth/password-reset/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "token": "%s",
                          "newPassword": "after-reset-password"
                        }
                        """.formatted(resetToken)
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true));

        mockMvc
            .perform(
                post("/auth/sign-in")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "host@example.com",
                          "password": "after-reset-password"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken", notNullValue()));

        mockMvc
            .perform(
                post("/auth/password-reset/confirm")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "token": "%s",
                          "newPassword": "another-reset-password"
                        }
                        """.formatted(resetToken)
                    )
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("INVALID_RESET_TOKEN"));
    }

    @Test
    void acceptsPasswordResetRequestForUnknownEmail() throws Exception {
        mockMvc
            .perform(
                post("/auth/password-reset/request")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "unknown@example.com"
                        }
                        """
                    )
            )
            .andExpect(status().isAccepted());
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

        return readJson(result).get("accessToken").asText();
    }

    private String requestPasswordResetToken(String email) throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/auth/password-reset/request")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "%s"
                        }
                        """.formatted(email)
                    )
            )
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.resetToken", notNullValue()))
            .andReturn();

        return readJson(result).get("resetToken").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
