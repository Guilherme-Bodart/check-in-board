package com.checkinboard.backend.modules.reservations;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.checkinboard.backend.BackendSpringApplication;
import com.checkinboard.backend.integrations.ical.IcalFeedClient;
import com.checkinboard.backend.integrations.ical.IcalFeedFetchException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(classes = BackendSpringApplication.class)
@AutoConfigureMockMvc
class ReservationControllerTest {

    private static final String ICS_TEXT =
        """
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:booking-1
        DTSTAMP:20260521T120000Z
        DTSTART:20260601T150000Z
        DTEND:20260604T110000Z
        SUMMARY:Guest Maria
        END:VEVENT
        END:VCALENDAR
        """;

    private static final String ALL_DAY_ICS_TEXT =
        """
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:booking-all-day-1
        DTSTAMP:20260521T120000Z
        DTSTART;VALUE=DATE:20260522
        DTEND;VALUE=DATE:20260525
        SUMMARY:Reserved
        END:VEVENT
        END:VCALENDAR
        """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private IcalFeedClient icalFeedClient;

    @BeforeEach
    void cleanDatabase() {
        reset(icalFeedClient);
        jdbcTemplate.update("delete from password_reset_tokens");
        jdbcTemplate.update("delete from tasks");
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
    void syncsIcalTextAndListsReservationsForApartment() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        mockMvc
            .perform(
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(syncPayload(ICS_TEXT))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.eventsSeen").value(1))
            .andExpect(jsonPath("$.summary.reservationsUpserted").value(1))
            .andExpect(jsonPath("$.summary.syncSkipped").value(false))
            .andExpect(jsonPath("$.reservations", hasSize(1)))
            .andExpect(jsonPath("$.reservations[0].id", notNullValue()))
            .andExpect(jsonPath("$.reservations[0].apartmentId").value(apartmentId))
            .andExpect(jsonPath("$.reservations[0].icalSourceId").value(icalSourceId))
            .andExpect(jsonPath("$.reservations[0].externalEventKey").value("booking-1"))
            .andExpect(jsonPath("$.reservations[0].rawSummary").value("Guest Maria"))
            .andExpect(jsonPath("$.reservations[0].provider").value("airbnb"));

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/reservations", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reservations", hasSize(1)))
            .andExpect(jsonPath("$.reservations[0].externalUid").value("booking-1"));
    }

    @Test
    void syncsStoredIcalUrlWhenRequestBodyIsEmpty() throws Exception {
        when(icalFeedClient.fetch(any())).thenReturn(ICS_TEXT);
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        mockMvc
            .perform(
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.eventsSeen").value(1))
            .andExpect(jsonPath("$.reservations", hasSize(1)))
            .andExpect(jsonPath("$.reservations[0].externalEventKey").value("booking-1"));

        mockMvc
            .perform(
                get("/ical-sources/{icalSourceId}/sync-runs", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.syncRuns", hasSize(1)))
            .andExpect(jsonPath("$.syncRuns[0].status").value("succeeded"))
            .andExpect(jsonPath("$.syncRuns[0].eventsSeen").value(1));
    }

    @Test
    void returnsOperationsBoardForApartmentWindow() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);
        syncIcalSource(accessToken, icalSourceId, ICS_TEXT);

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/operations-board", apartmentId)
                    .queryParam("date", "2026-06-01")
                    .queryParam("days", "7")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartmentId").value(apartmentId))
            .andExpect(jsonPath("$.date").value("2026-06-01"))
            .andExpect(jsonPath("$.days").value(7))
            .andExpect(jsonPath("$.timezone").value("America/Sao_Paulo"))
            .andExpect(jsonPath("$.checkIns.count").value(1))
            .andExpect(jsonPath("$.checkOuts.count").value(0))
            .andExpect(jsonPath("$.inHouse.count").value(1))
            .andExpect(jsonPath("$.upcoming.count").value(0))
            .andExpect(jsonPath("$.totals.checkIns").value(1))
            .andExpect(jsonPath("$.checkIns.reservations[0].rawSummary").value("Guest Maria"));
    }

    @Test
    void keepsAllDayReservationsOnApartmentTimezoneDates() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);
        syncIcalSource(accessToken, icalSourceId, ALL_DAY_ICS_TEXT);

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/operations-board", apartmentId)
                    .queryParam("date", "2026-05-22")
                    .queryParam("days", "7")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.checkIns.count").value(1))
            .andExpect(jsonPath("$.inHouse.count").value(1))
            .andExpect(jsonPath("$.upcoming.count").value(0))
            .andExpect(jsonPath("$.checkIns.reservations[0].startsAt").value("2026-05-22T03:00:00Z"))
            .andExpect(jsonPath("$.checkIns.reservations[0].endsAt").value("2026-05-25T03:00:00Z"));
    }

    @Test
    void rejectsInvalidOperationsBoardWindow() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/operations-board", apartmentId)
                    .queryParam("date", "2026-06-01")
                    .queryParam("days", "45")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    void updatesExistingReservationWhenSyncedAgain() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        syncIcalSource(accessToken, icalSourceId, ICS_TEXT);
        syncIcalSource(
            accessToken,
            icalSourceId,
            ICS_TEXT.replace("Guest Maria", "Guest Maria Updated")
        );

        Integer count = jdbcTemplate.queryForObject(
            "select count(*) from reservations",
            Integer.class
        );

        org.hamcrest.MatcherAssert.assertThat(count, org.hamcrest.Matchers.is(1));
        org.hamcrest.MatcherAssert.assertThat(
            jdbcTemplate.queryForObject(
                "select last_success_at is not null from ical_sources where id = ?",
                Boolean.class,
                icalSourceId
            ),
            org.hamcrest.Matchers.is(true)
        );

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/reservations", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reservations[0].rawSummary").value("Guest Maria Updated"));
    }

    @Test
    void rejectsSyncWithoutManagementPermission() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);
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
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(syncPayload(ICS_TEXT))
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
            .andExpect(
                jsonPath("$.error.message").value(
                    "You do not have permission to sync this iCal source."
                )
            );
    }

    @Test
    void rejectsReservationListWithoutApartmentAccess() throws Exception {
        String hostAccessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(hostAccessToken, "Apto 204");
        String otherAccessToken = signUpHost("other@example.com", "Other Ops");

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/reservations", apartmentId)
                    .header("Authorization", "Bearer " + otherAccessToken)
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void rejectsInvalidIcalPayload() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        mockMvc
            .perform(
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(syncPayload("not ics"))
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    void recordsFailedStoredUrlSync() throws Exception {
        when(icalFeedClient.fetch(any()))
            .thenThrow(new IcalFeedFetchException("iCal feed returned HTTP 500."));
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        mockMvc
            .perform(
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.error.code").value("ICAL_FETCH_FAILED"));

        mockMvc
            .perform(
                get("/ical-sources/{icalSourceId}/sync-runs", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.syncRuns", hasSize(1)))
            .andExpect(jsonPath("$.syncRuns[0].status").value("failed"))
            .andExpect(jsonPath("$.syncRuns[0].errorMessage").value("iCal feed returned HTTP 500."));
    }

    private void syncIcalSource(String accessToken, String icalSourceId, String icsText)
        throws Exception {
        mockMvc
            .perform(
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(syncPayload(icsText))
            )
            .andExpect(status().isOk());
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

    private String createIcalSource(String accessToken, String apartmentId) throws Exception {
        MvcResult result = mockMvc
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
            .andReturn();

        return readJson(result).get("icalSource").get("id").asText();
    }

    private String userIdByEmail(String email) {
        return jdbcTemplate.queryForObject(
            "select id from users where email = ?",
            String.class,
            email
        );
    }

    private String syncPayload(String icsText) throws Exception {
        return objectMapper.writeValueAsString(
            java.util.Map.of("icsText", icsText.replace("\r\n", "\n"))
        );
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
