package com.checkinboard.backend.modules.finance;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
class FinanceMvpControllerTest {

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
    void summarizesSettlesAndExportsFinanceMvpData() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        MvcResult apartmentResult = createApartment(accessToken, "Apto 204");
        JsonNode apartment = readJson(apartmentResult).get("apartment");
        String apartmentId = apartment.get("id").asText();
        String ownerId = apartment.get("owner").get("id").asText();
        createRentalStay(accessToken, apartmentId);
        createExpense(accessToken, apartmentId);

        mockMvc
            .perform(
                get("/finance-mvp/summary")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("month", "2026-05")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rentCents").value(120000))
            .andExpect(jsonPath("$.expenseCents").value(20000))
            .andExpect(jsonPath("$.netCents").value(100000))
            .andExpect(jsonPath("$.commissionCents").value(24000))
            .andExpect(jsonPath("$.payoutCents").value(96000))
            .andExpect(jsonPath("$.stayCount").value(1))
            .andExpect(jsonPath("$.byApartment[0].settlementStatus").value("pending"));

        mockMvc
            .perform(
                post("/settlements/mark-paid")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "periodMonth": "2026-05",
                          "apartmentId": "%s",
                          "ownerId": "%s",
                          "notes": "Pix enviado"
                        }
                        """.formatted(apartmentId, ownerId)
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.settlement.status").value("paid"));

        mockMvc
            .perform(
                get("/finance-mvp/summary")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("month", "2026-05")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.byApartment[0].settlementStatus").value("paid"));

        mockMvc
            .perform(
                get("/finance-mvp/export.csv")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("month", "2026-05")
            )
            .andExpect(status().isOk())
            .andExpect(content().string(containsString("tipo,nome,cliente")))
            .andExpect(content().string(containsString("apartamento")));
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

    private MvcResult createApartment(String accessToken, String apartmentName)
        throws Exception {
        return mockMvc
            .perform(
                post("/apartments")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "%s",
                          "timezone": "America/Sao_Paulo",
                          "managementCommissionBps": 2000
                        }
                        """.formatted(apartmentName)
                    )
            )
            .andExpect(status().isCreated())
            .andReturn();
    }

    private void createRentalStay(String accessToken, String apartmentId) throws Exception {
        mockMvc
            .perform(
                post("/rental-stays")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "apartmentId": "%s",
                          "guestName": "Maria",
                          "channel": "Manual",
                          "checkIn": "2026-05-20",
                          "checkOut": "2026-05-23",
                          "rentAmountCents": 120000,
                          "currency": "BRL"
                        }
                        """.formatted(apartmentId)
                    )
            )
            .andExpect(status().isCreated());
    }

    private void createExpense(String accessToken, String apartmentId) throws Exception {
        mockMvc
            .perform(
                post("/financial-entries")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "apartmentId": "%s",
                          "type": "expense",
                          "category": "consumo",
                          "description": "Papel higienico",
                          "amountCents": 20000,
                          "currency": "BRL",
                          "occurredOn": "2026-05-21"
                        }
                        """.formatted(apartmentId)
                    )
            )
            .andExpect(status().isCreated());
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
