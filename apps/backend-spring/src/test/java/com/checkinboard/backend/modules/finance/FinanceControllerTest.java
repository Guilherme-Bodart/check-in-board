package com.checkinboard.backend.modules.finance;

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
class FinanceControllerTest {

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
        jdbcTemplate.update("delete from owners");
        jdbcTemplate.update("delete from organization_memberships");
        jdbcTemplate.update("delete from organizations");
        jdbcTemplate.update("delete from users");
    }

    @Test
    void createsListsSummarizesUpdatesAndDeletesFinancialEntries() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        MvcResult revenue = createEntry(
            accessToken,
            apartmentId,
            "revenue",
            "Hospedagem",
            120000
        );
        createEntry(accessToken, apartmentId, "expense", "Limpeza", 20000);
        String entryId = readJson(revenue).get("financialEntry").get("id").asText();

        mockMvc
            .perform(
                get("/financial-entries")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("dateFrom", "2026-05-01")
                    .param("dateTo", "2026-05-31")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.financialEntries", hasSize(2)));

        mockMvc
            .perform(
                get("/financial-summary")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("dateFrom", "2026-05-01")
                    .param("dateTo", "2026-05-31")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.revenueCents").value(120000))
            .andExpect(jsonPath("$.expenseCents").value(20000))
            .andExpect(jsonPath("$.profitCents").value(100000))
            .andExpect(jsonPath("$.byOwner", hasSize(1)))
            .andExpect(jsonPath("$.byApartment", hasSize(1)));

        mockMvc
            .perform(
                put("/financial-entries/{entryId}", entryId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(entryPayload(apartmentId, "revenue", "Hospedagem", 150000))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.financialEntry.amountCents").value(150000));

        mockMvc
            .perform(
                delete("/financial-entries/{entryId}", entryId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isNoContent());

        mockMvc
            .perform(
                get("/financial-entries")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("dateFrom", "2026-05-01")
                    .param("dateTo", "2026-05-31")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.financialEntries", hasSize(1)));
    }

    @Test
    void rejectsFinancialManagementForNonHostAdmin() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        createTeamMember(accessToken, apartmentId, "cleaner@example.com");
        String teamAccessToken = signIn("cleaner@example.com", "secure-password");

        mockMvc
            .perform(get("/financial-summary").header("Authorization", "Bearer " + teamAccessToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void rejectsCrossOrganizationApartmentEntry() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String otherAccessToken = signUpHost("other@example.com", "Other Ops");
        String otherApartmentId = createApartment(otherAccessToken, "Outro Apto");

        mockMvc
            .perform(
                post("/financial-entries")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        entryPayload(
                            otherApartmentId,
                            "revenue",
                            "Hospedagem",
                            10000
                        )
                    )
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    private MvcResult createEntry(
        String accessToken,
        String apartmentId,
        String type,
        String category,
        long amountCents
    ) throws Exception {
        return mockMvc
            .perform(
                post("/financial-entries")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(entryPayload(apartmentId, type, category, amountCents))
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.financialEntry.id", notNullValue()))
            .andExpect(jsonPath("$.financialEntry.type").value(type))
            .andReturn();
    }

    private String entryPayload(
        String apartmentId,
        String type,
        String category,
        long amountCents
    ) {
        return """
            {
              "apartmentId": "%s",
              "type": "%s",
              "category": "%s",
              "description": "Lancamento manual",
              "amountCents": %d,
              "currency": "BRL",
              "occurredOn": "2026-05-21"
            }
            """.formatted(apartmentId, type, category, amountCents);
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
                    .content(
                        """
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
                        """.formatted(email, apartmentId)
                    )
            )
            .andExpect(status().isCreated())
            .andReturn();

        return readJson(result).get("teamMember").get("membershipId").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
