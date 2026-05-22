package com.checkinboard.backend.modules.apartments;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

@SpringBootTest(classes = BackendSpringApplication.class)
@AutoConfigureMockMvc
class ApartmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from password_reset_tokens");
        jdbcTemplate.update("delete from tasks");
        jdbcTemplate.update("delete from financial_entries");
        jdbcTemplate.update("delete from sync_runs");
        jdbcTemplate.update("delete from reservations");
        jdbcTemplate.update("delete from ical_sources");
        jdbcTemplate.update("delete from apartment_memberships");
        jdbcTemplate.update("delete from apartments");
        jdbcTemplate.update("delete from organization_memberships");
        jdbcTemplate.update("delete from organizations");
        jdbcTemplate.update("delete from users");
    }

    @Test
    void createsAndListsApartmentsForHostAdmin() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");

        MvcResult result = mockMvc
            .perform(
                post("/apartments")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Apto 204",
                          "timezone": "America/Sao_Paulo"
                        }
                        """
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.apartment.id", notNullValue()))
            .andExpect(jsonPath("$.apartment.name").value("Apto 204"))
            .andExpect(jsonPath("$.apartment.timezone").value("America/Sao_Paulo"))
            .andExpect(jsonPath("$.apartment.owner.id", notNullValue()))
            .andExpect(jsonPath("$.apartment.owner.name").value("Host Ops - Imoveis proprios"))
            .andExpect(jsonPath("$.apartment.owner.type").value("internal"))
            .andExpect(jsonPath("$.apartment.membership.role").value("host_admin"))
            .andExpect(jsonPath("$.apartment.membership.canView").value(true))
            .andExpect(jsonPath("$.apartment.membership.canManageIntegrations").value(true))
            .andExpect(jsonPath("$.apartment.membership.canUpdateTaskStatus").value(true))
            .andReturn();

        String apartmentId = readJson(result).get("apartment").get("id").asText();

        mockMvc
            .perform(get("/apartments").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartments", hasSize(1)))
            .andExpect(jsonPath("$.apartments[0].id").value(apartmentId))
            .andExpect(jsonPath("$.apartments[0].name").value("Apto 204"))
            .andExpect(jsonPath("$.apartments[0].owner.type").value("internal"));

        mockMvc
            .perform(
                get("/apartments/{apartmentId}", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartment.id").value(apartmentId));
    }

    @Test
    void updatesAndSoftDeletesApartmentsForHostAdmin() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                put("/apartments/{apartmentId}", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Apto 305",
                          "timezone": "America/Fortaleza"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartment.name").value("Apto 305"))
            .andExpect(jsonPath("$.apartment.timezone").value("America/Fortaleza"));

        mockMvc
            .perform(
                delete("/apartments/{apartmentId}", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isNoContent());

        mockMvc
            .perform(get("/apartments").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartments", hasSize(0)));

        mockMvc
            .perform(
                get("/apartments/{apartmentId}", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("APARTMENT_NOT_FOUND"));
    }

    @Test
    void rejectsApartmentCreationForNonHostAdmin() throws Exception {
        String accessToken = signUpHost("cohost@example.com", "Host Ops");
        String userId = userIdByEmail("cohost@example.com");
        jdbcTemplate.update(
            "update organization_memberships set role = 'co_host' where user_id = ?",
            userId
        );

        mockMvc
            .perform(
                post("/apartments")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Apto 204",
                          "timezone": "America/Sao_Paulo"
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
            .andExpect(
                jsonPath("$.error.message").value(
                    "You do not have permission to create apartments."
                )
            );
    }

    @Test
    void rejectsApartmentManagementOutsideUserOrganization() throws Exception {
        String hostAccessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(hostAccessToken, "Apto 204");
        String otherHostAccessToken = signUpHost("other@example.com", "Other Ops");

        mockMvc
            .perform(
                put("/apartments/{apartmentId}", apartmentId)
                    .header("Authorization", "Bearer " + otherHostAccessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Apto 999",
                          "timezone": "America/Sao_Paulo"
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void rejectsInvalidTimezone() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");

        mockMvc
            .perform(
                post("/apartments")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Apto 204",
                          "timezone": "Brazil"
                        }
                        """
                    )
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"))
            .andExpect(jsonPath("$.error.message").value("Invalid timezone."));
    }

    @Test
    void requiresAuthenticationToListApartments() throws Exception {
        mockMvc
            .perform(get("/apartments"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    private String signUpHost(String email, String organizationName) throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/auth/sign-up")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "%s",
                          "fullName": "Host Admin",
                          "organizationName": "%s",
                          "password": "secure-password"
                        }
                        """.formatted(email, organizationName)
                    )
            )
            .andExpect(status().isCreated())
            .andReturn();

        return readJson(result).get("accessToken").asText();
    }

    private String createApartment(String accessToken, String apartmentName) throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/apartments")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "%s",
                          "timezone": "America/Sao_Paulo"
                        }
                        """.formatted(apartmentName)
                    )
            )
            .andExpect(status().isCreated())
            .andReturn();

        return readJson(result).get("apartment").get("id").asText();
    }

    private String userIdByEmail(String email) {
        return jdbcTemplate.queryForObject(
            "select id from users where email = ?",
            String.class,
            email
        );
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
