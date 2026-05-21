package com.checkinboard.backend.modules.icalsources;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
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

@SpringBootTest(classes = BackendSpringApplication.class)
@AutoConfigureMockMvc
class IcalSourceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from password_reset_tokens");
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
    void createsAndListsIcalSourcesForApartmentManager() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/ical-sources", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "provider": "airbnb",
                          "label": "Airbnb Apto 204",
                          "icalUrl": "https://93.184.216.34/calendar.ics"
                        }
                        """
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.icalSource.id", notNullValue()))
            .andExpect(jsonPath("$.icalSource.provider").value("airbnb"))
            .andExpect(jsonPath("$.icalSource.label").value("Airbnb Apto 204"))
            .andExpect(jsonPath("$.icalSource.syncEnabled").value(true))
            .andExpect(jsonPath("$.icalSource.lastSuccessAt").doesNotExist())
            .andExpect(jsonPath("$.icalSource.lastFailureAt").doesNotExist());

        String encryptedUrl = jdbcTemplate.queryForObject(
            "select ical_url_encrypted from ical_sources",
            String.class
        );

        org.hamcrest.MatcherAssert.assertThat(encryptedUrl, startsWith("v1:"));
        org.hamcrest.MatcherAssert.assertThat(
            encryptedUrl,
            not("https://93.184.216.34/calendar.ics")
        );

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/ical-sources", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.icalSources", hasSize(1)))
            .andExpect(jsonPath("$.icalSources[0].provider").value("airbnb"));
    }

    @Test
    void rejectsIcalSourceCreationWithoutManagementPermission() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String userId = userIdByEmail("host@example.com");

        jdbcTemplate.update(
            """
            update apartment_memberships
            set role = 'co_host', can_manage_integrations = false
            where apartment_id = ? and user_id = ?
            """,
            apartmentId,
            userId
        );

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/ical-sources", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "provider": "airbnb",
                          "label": "Airbnb Apto 204",
                          "icalUrl": "https://93.184.216.34/calendar.ics"
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
            .andExpect(
                jsonPath("$.error.message").value(
                    "You do not have permission to manage iCal sources."
                )
            );
    }

    @Test
    void rejectsPrivateNetworkIcalUrls() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/ical-sources", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "provider": "airbnb",
                          "label": "Airbnb Apto 204",
                          "icalUrl": "http://127.0.0.1/calendar.ics"
                        }
                        """
                    )
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("UNSAFE_ICAL_URL"))
            .andExpect(
                jsonPath("$.error.message").value(
                    "Private network iCal URLs are not allowed."
                )
            );
    }

    @Test
    void rejectsIcalSourceListingWithoutApartmentAccess() throws Exception {
        String hostAccessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(hostAccessToken, "Apto 204");
        String otherAccessToken = signUpHost("other@example.com", "Other Ops");

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/ical-sources", apartmentId)
                    .header("Authorization", "Bearer " + otherAccessToken)
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
            .andExpect(
                jsonPath("$.error.message").value(
                    "You do not have access to this apartment."
                )
            );
    }

    @Test
    void requiresAuthenticationToListIcalSources() throws Exception {
        mockMvc
            .perform(get("/apartments/apartment-1/ical-sources"))
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
