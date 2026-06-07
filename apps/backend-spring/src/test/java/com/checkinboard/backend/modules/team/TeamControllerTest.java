package com.checkinboard.backend.modules.team;

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
class TeamControllerTest {

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
        jdbcTemplate.update("delete from rental_stays");
        jdbcTemplate.update("delete from sync_runs");
        jdbcTemplate.update("delete from reservations");
        jdbcTemplate.update("delete from ical_sources");
        jdbcTemplate.update("delete from apartment_memberships");
        jdbcTemplate.update("delete from apartments");
        jdbcTemplate.update("delete from owners");
        jdbcTemplate.update("delete from organization_memberships");
        jdbcTemplate.update("delete from organizations");
        jdbcTemplate.update("delete from users");
    }

    @Test
    void createsListsUpdatesAndDeactivatesTeamMember() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        MvcResult createResult = mockMvc
            .perform(
                post("/team-members")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "cleaner@example.com",
                          "fullName": "Cleaner One",
                          "password": "secure-password",
                          "role": "team",
                          "apartmentPermissions": [
                            {
                              "apartmentId": "%s",
                              "canView": true,
                              "canUpdateTaskStatus": true,
                              "canManageIntegrations": false
                            }
                          ]
                        }
                        """.formatted(apartmentId)
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.teamMember.membershipId", notNullValue()))
            .andExpect(jsonPath("$.teamMember.email").value("cleaner@example.com"))
            .andExpect(jsonPath("$.teamMember.role").value("team"))
            .andExpect(jsonPath("$.teamMember.active").value(true))
            .andExpect(jsonPath("$.teamMember.apartmentPermissions", hasSize(1)))
            .andExpect(
                jsonPath("$.teamMember.apartmentPermissions[0].canUpdateTaskStatus")
                    .value(true)
            )
            .andReturn();

        String membershipId = readJson(createResult)
            .get("teamMember")
            .get("membershipId")
            .asText();

        mockMvc
            .perform(get("/team-members").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.teamMembers", hasSize(2)));

        mockMvc
            .perform(
                put("/team-members/{membershipId}", membershipId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "role": "co_host",
                          "active": true,
                          "apartmentPermissions": [
                            {
                              "apartmentId": "%s",
                              "canView": true,
                              "canUpdateTaskStatus": true,
                              "canManageIntegrations": true
                            }
                          ]
                        }
                        """.formatted(apartmentId)
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.teamMember.role").value("co_host"))
            .andExpect(
                jsonPath("$.teamMember.apartmentPermissions[0].canManageIntegrations")
                    .value(true)
            );

        mockMvc
            .perform(
                delete("/team-members/{membershipId}", membershipId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isNoContent());

        mockMvc
            .perform(get("/team-members").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.teamMembers[1].active").value(false))
            .andExpect(jsonPath("$.teamMembers[1].apartmentPermissions", hasSize(0)));
    }

    @Test
    void rejectsDuplicateActiveTeamMember() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        createTeamMember(accessToken, apartmentId, "cleaner@example.com");

        mockMvc
            .perform(
                post("/team-members")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createTeamMemberPayload(apartmentId, "cleaner@example.com"))
            )
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("TEAM_MEMBER_ALREADY_EXISTS"));
    }

    @Test
    void rejectsTeamManagementForNonHostAdmin() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        createTeamMember(accessToken, apartmentId, "cleaner@example.com");
        String teamAccessToken = signIn("cleaner@example.com", "secure-password");

        mockMvc
            .perform(get("/team-members").header("Authorization", "Bearer " + teamAccessToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void rejectsSelfDeactivation() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String membershipId = firstMembershipId(accessToken);

        mockMvc
            .perform(
                delete("/team-members/{membershipId}", membershipId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("CANNOT_DEACTIVATE_SELF"));
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

    private String signIn(String email, String password) throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/auth/sign-in")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "%s",
                          "password": "%s"
                        }
                        """.formatted(email, password)
                    )
            )
            .andExpect(status().isOk())
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

    private String createTeamMember(String accessToken, String apartmentId, String email)
        throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/team-members")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(createTeamMemberPayload(apartmentId, email))
            )
            .andExpect(status().isCreated())
            .andReturn();

        return readJson(result).get("teamMember").get("membershipId").asText();
    }

    private String createTeamMemberPayload(String apartmentId, String email) {
        return """
            {
              "email": "%s",
              "fullName": "Cleaner One",
              "password": "secure-password",
              "role": "team",
              "apartmentPermissions": [
                {
                  "apartmentId": "%s",
                  "canView": true,
                  "canUpdateTaskStatus": true,
                  "canManageIntegrations": false
                }
              ]
            }
            """.formatted(email, apartmentId);
    }

    private String firstMembershipId(String accessToken) throws Exception {
        MvcResult result = mockMvc
            .perform(get("/team-members").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andReturn();

        return readJson(result).get("teamMembers").get(0).get("membershipId").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
