package com.checkinboard.backend.modules.finance;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class RecurringExpenseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from recurring_expense_applications");
        jdbcTemplate.update("delete from recurring_expenses");
        jdbcTemplate.update("delete from password_reset_tokens");
        jdbcTemplate.update("delete from tasks");
        jdbcTemplate.update("delete from settlement_periods");
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
    void createsListsUpdatesAndSoftDeletesRecurringExpenses() throws Exception {
        String hostToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(hostToken, "Apto 101");

        MvcResult createdCondo = createRecurringExpense(
            hostToken,
            apartmentId,
            "Condomínio Mensal",
            "Condomínio",
            85000,
            10,
            "Boleto administradora"
        );
        String condoId = readJson(createdCondo).get("item").get("id").asText();

        createRecurringExpense(
            hostToken,
            apartmentId,
            "Internet Fibra",
            "Contas",
            14990,
            5,
            null
        );

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/recurring-expenses", apartmentId)
                    .header("Authorization", "Bearer " + hostToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartmentId").value(apartmentId))
            .andExpect(jsonPath("$.items", hasSize(2)))
            .andExpect(jsonPath("$.items[0].title").value("Internet Fibra"))
            .andExpect(jsonPath("$.items[0].category").value("contas"))
            .andExpect(jsonPath("$.items[0].dayOfMonth").value(5))
            .andExpect(jsonPath("$.items[1].title").value("Condomínio Mensal"))
            .andExpect(jsonPath("$.items[1].category").value("condominio"))
            .andExpect(jsonPath("$.items[1].dayOfMonth").value(10));

        mockMvc
            .perform(
                patch("/recurring-expenses/{id}", condoId)
                    .header("Authorization", "Bearer " + hostToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "Condomínio Atualizado",
                          "amountCents": 90000,
                          "dayOfMonth": 12
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.item.id").value(condoId))
            .andExpect(jsonPath("$.item.title").value("Condomínio Atualizado"))
            .andExpect(jsonPath("$.item.amountCents").value(90000))
            .andExpect(jsonPath("$.item.dayOfMonth").value(12));

        mockMvc
            .perform(
                delete("/recurring-expenses/{id}", condoId)
                    .header("Authorization", "Bearer " + hostToken)
            )
            .andExpect(status().isNoContent());

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/recurring-expenses", apartmentId)
                    .header("Authorization", "Bearer " + hostToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items", hasSize(1)))
            .andExpect(jsonPath("$.items[0].title").value("Internet Fibra"));
    }

    @Test
    void enforcesCoHostReadOnlyAccessAndBlocksCrossApartmentOrMutations() throws Exception {
        String hostToken = signUpHost("host@example.com", "Host Ops");
        String permittedApartmentId = createApartment(hostToken, "Apto 101");
        String otherApartmentId = createApartment(hostToken, "Apto 202");

        MvcResult created = createRecurringExpense(
            hostToken,
            permittedApartmentId,
            "Condomínio",
            "Condomínio",
            85000,
            10,
            null
        );
        String expenseId = readJson(created).get("item").get("id").asText();

        createCoHostMember(hostToken, permittedApartmentId, "cohost@example.com");
        String coHostToken = signIn("cohost@example.com", "secure-password");

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/recurring-expenses", permittedApartmentId)
                    .header("Authorization", "Bearer " + coHostToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartmentId").value(permittedApartmentId))
            .andExpect(jsonPath("$.items", hasSize(1)))
            .andExpect(jsonPath("$.items[0].id").value(expenseId));

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/recurring-expenses", otherApartmentId)
                    .header("Authorization", "Bearer " + coHostToken)
            )
            .andExpect(status().isForbidden());

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/recurring-expenses", permittedApartmentId)
                    .header("Authorization", "Bearer " + coHostToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "IPTU",
                          "category": "taxas",
                          "amountCents": 30000,
                          "dayOfMonth": 15
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden());

        mockMvc
            .perform(
                patch("/recurring-expenses/{id}", expenseId)
                    .header("Authorization", "Bearer " + coHostToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "amountCents": 95000
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden());

        mockMvc
            .perform(
                delete("/recurring-expenses/{id}", expenseId)
                    .header("Authorization", "Bearer " + coHostToken)
            )
            .andExpect(status().isForbidden());

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/recurring-expenses/apply-month", permittedApartmentId)
                    .header("Authorization", "Bearer " + coHostToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "month": "2026-11"
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden());
    }

    @Test
    void appliesMonthIdempotentlyCreatingFinancialEntriesOnlyOncePerMonth() throws Exception {
        String hostToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(hostToken, "Apto 303");

        createRecurringExpense(
            hostToken,
            apartmentId,
            "Condomínio",
            "condominio",
            85000,
            10,
            "Taxa fixa"
        );
        createRecurringExpense(
            hostToken,
            apartmentId,
            "Internet",
            "contas",
            15000,
            5,
            null
        );

        // First apply for 2026-11 creates 2 entries
        mockMvc
            .perform(
                post("/apartments/{apartmentId}/recurring-expenses/apply-month", apartmentId)
                    .header("Authorization", "Bearer " + hostToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "month": "2026-11"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.month").value("2026-11"))
            .andExpect(jsonPath("$.createdCount").value(2))
            .andExpect(jsonPath("$.skippedCount").value(0))
            .andExpect(jsonPath("$.createdEntryIds", hasSize(2)));

        // Second apply for 2026-11 skips all 2 already-applied expenses
        mockMvc
            .perform(
                post("/apartments/{apartmentId}/recurring-expenses/apply-month", apartmentId)
                    .header("Authorization", "Bearer " + hostToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "month": "2026-11"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.month").value("2026-11"))
            .andExpect(jsonPath("$.createdCount").value(0))
            .andExpect(jsonPath("$.skippedCount").value(2))
            .andExpect(jsonPath("$.createdEntryIds", hasSize(0)));

        // Verify financial entries in 2026-11
        mockMvc
            .perform(
                get("/financial-entries")
                    .header("Authorization", "Bearer " + hostToken)
                    .param("apartmentId", apartmentId)
                    .param("dateFrom", "2026-11-01")
                    .param("dateTo", "2026-11-30")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.financialEntries", hasSize(2)))
            .andExpect(jsonPath("$.financialEntries[0].type").value("expense"))
            .andExpect(jsonPath("$.financialEntries[0].description").value("Condomínio (Fixa 2026-11)"))
            .andExpect(jsonPath("$.financialEntries[0].occurredOn").value("2026-11-10"))
            .andExpect(jsonPath("$.financialEntries[0].amountCents").value(85000))
            .andExpect(jsonPath("$.financialEntries[1].type").value("expense"))
            .andExpect(jsonPath("$.financialEntries[1].description").value("Internet (Fixa 2026-11)"))
            .andExpect(jsonPath("$.financialEntries[1].occurredOn").value("2026-11-05"))
            .andExpect(jsonPath("$.financialEntries[1].amountCents").value(15000));
    }

    private MvcResult createRecurringExpense(
        String accessToken,
        String apartmentId,
        String title,
        String category,
        long amountCents,
        int dayOfMonth,
        String notes
    ) throws Exception {
        return mockMvc
            .perform(
                post("/apartments/{apartmentId}/recurring-expenses", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "%s",
                          "category": "%s",
                          "amountCents": %d,
                          "dayOfMonth": %d,
                          "notes": %s,
                          "active": true
                        }
                        """.formatted(
                                title,
                                category,
                                amountCents,
                                dayOfMonth,
                                notes == null ? "null" : "\"%s\"".formatted(notes)
                            )
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.item.id", notNullValue()))
            .andReturn();
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

    private String createCoHostMember(String accessToken, String apartmentId, String email)
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
                          "fullName": "Apartment Owner",
                          "password": "secure-password",
                          "role": "co_host",
                          "apartmentPermissions": [
                            {
                              "apartmentId": "%s",
                              "canView": true,
                              "canUpdateTaskStatus": false,
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
