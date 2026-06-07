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
class RentalStayControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanDatabase() {
        jdbcTemplate.update("delete from rental_stays");
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
    void createsListsUpdatesAndDeletesRentalStays() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        MvcResult createResult = mockMvc
            .perform(
                post("/rental-stays")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(rentalStayPayload(apartmentId, "Maria", 120000))
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.rentalStay.id", notNullValue()))
            .andExpect(jsonPath("$.rentalStay.apartmentId").value(apartmentId))
            .andExpect(jsonPath("$.rentalStay.ownerName").value("Host Ops - Imoveis proprios"))
            .andExpect(jsonPath("$.rentalStay.guestName").value("Maria"))
            .andExpect(jsonPath("$.rentalStay.rentAmountCents").value(120000))
            .andReturn();

        String rentalStayId = readJson(createResult)
            .get("rentalStay")
            .get("id")
            .asText();

        mockMvc
            .perform(
                get("/rental-stays")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("dateFrom", "2026-06-01")
                    .param("dateTo", "2026-06-30")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rentalStays", hasSize(1)))
            .andExpect(jsonPath("$.rentalStays[0].id").value(rentalStayId));

        mockMvc
            .perform(
                put("/rental-stays/{rentalStayId}", rentalStayId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(rentalStayPayload(apartmentId, "Joao", 150000))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rentalStay.guestName").value("Joao"))
            .andExpect(jsonPath("$.rentalStay.rentAmountCents").value(150000));

        mockMvc
            .perform(
                delete("/rental-stays/{rentalStayId}", rentalStayId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isNoContent());

        mockMvc
            .perform(
                get("/rental-stays")
                    .header("Authorization", "Bearer " + accessToken)
                    .param("dateFrom", "2026-06-01")
                    .param("dateTo", "2026-06-30")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.rentalStays", hasSize(0)));
    }

    @Test
    void rejectsInvalidRentalStayDates() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                post("/rental-stays")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "apartmentId": "%s",
                          "checkIn": "2026-06-10",
                          "checkOut": "2026-06-10",
                          "rentAmountCents": 120000,
                          "currency": "BRL"
                        }
                        """.formatted(apartmentId)
                    )
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.message").value("checkOut must be after checkIn."));
    }

    private String rentalStayPayload(
        String apartmentId,
        String guestName,
        long rentAmountCents
    ) {
        return """
            {
              "apartmentId": "%s",
              "guestName": "%s",
              "channel": "Airbnb",
              "checkIn": "2026-06-10",
              "checkOut": "2026-06-14",
              "rentAmountCents": %d,
              "currency": "BRL",
              "notes": "Reserva manual"
            }
            """.formatted(apartmentId, guestName, rentAmountCents);
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

    private String createApartment(String accessToken, String apartmentName)
        throws Exception {
        MvcResult result = mockMvc
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

        return readJson(result).get("apartment").get("id").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
