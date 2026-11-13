package com.checkinboard.backend.modules.reservations;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
        jdbcTemplate.update("delete from settlement_periods");
        jdbcTemplate.update("delete from financial_entries");
        jdbcTemplate.update("delete from rental_stays");
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
    void skipsSyncWhenIcalSourceIsPaused() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        mockMvc
            .perform(
                put(
                    "/apartments/{apartmentId}/ical-sources/{icalSourceId}",
                    apartmentId,
                    icalSourceId
                )
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "provider": "airbnb",
                          "label": "Airbnb Apto 204",
                          "icalUrl": "",
                          "syncEnabled": false
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.icalSource.syncEnabled").value(false));

        mockMvc
            .perform(
                post("/ical-sources/{icalSourceId}/sync", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(syncPayload(ICS_TEXT))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.summary.eventsSeen").value(0))
            .andExpect(jsonPath("$.summary.reservationsUpserted").value(0))
            .andExpect(jsonPath("$.summary.syncSkipped").value(true))
            .andExpect(jsonPath("$.summary.syncSkippedReason").value("iCal source sync is paused."))
            .andExpect(jsonPath("$.reservations", hasSize(0)));

        mockMvc
            .perform(
                get("/ical-sources/{icalSourceId}/sync-runs", icalSourceId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.syncRuns", hasSize(1)))
            .andExpect(jsonPath("$.syncRuns[0].status").value("skipped"))
            .andExpect(jsonPath("$.syncRuns[0].errorMessage").value("iCal source sync is paused."));
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

        mockMvc
            .perform(
                get("/operations-board")
                    .queryParam("date", "2026-06-01")
                    .queryParam("days", "45")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    void aggregatesOperationsBoardAcrossVisibleApartmentsAndRespectsCoHostVisibility()
        throws Exception {
        String hostAccessToken = signUpHost("host@example.com", "Host Ops");
        String apartment1Id = createApartment(hostAccessToken, "Apto 101");
        String apartment2Id = createApartment(hostAccessToken, "Apto 202");
        String apartment3Id = createApartment(hostAccessToken, "Apto 303");

        String source1Id = createIcalSource(hostAccessToken, apartment1Id);
        String source2Id = createIcalSource(hostAccessToken, apartment2Id);
        String source3Id = createIcalSource(hostAccessToken, apartment3Id);

        syncIcalSource(
            hostAccessToken,
            source1Id,
            """
            BEGIN:VCALENDAR
            VERSION:2.0
            BEGIN:VEVENT
            UID:apt1-checkin
            DTSTAMP:20260521T120000Z
            DTSTART:20260601T160000Z
            DTEND:20260603T110000Z
            SUMMARY:Guest Alice
            END:VEVENT
            BEGIN:VEVENT
            UID:apt1-upcoming
            DTSTAMP:20260521T120000Z
            DTSTART:20260604T150000Z
            DTEND:20260606T110000Z
            SUMMARY:Guest Bob
            END:VEVENT
            END:VCALENDAR
            """
        );

        syncIcalSource(
            hostAccessToken,
            source2Id,
            """
            BEGIN:VCALENDAR
            VERSION:2.0
            BEGIN:VEVENT
            UID:apt2-checkin-earlier
            DTSTAMP:20260521T120000Z
            DTSTART:20260601T140000Z
            DTEND:20260602T110000Z
            SUMMARY:Guest Carol
            END:VEVENT
            BEGIN:VEVENT
            UID:apt2-checkout
            DTSTAMP:20260521T120000Z
            DTSTART:20260529T150000Z
            DTEND:20260601T110000Z
            SUMMARY:Guest Dave
            END:VEVENT
            END:VCALENDAR
            """
        );

        syncIcalSource(
            hostAccessToken,
            source3Id,
            """
            BEGIN:VCALENDAR
            VERSION:2.0
            BEGIN:VEVENT
            UID:apt3-hidden
            DTSTAMP:20260521T120000Z
            DTSTART:20260601T150000Z
            DTEND:20260603T110000Z
            SUMMARY:Guest Eve
            END:VEVENT
            END:VCALENDAR
            """
        );

        // host_admin sees all 3 apartments aggregated and sorted by startsAt
        mockMvc
            .perform(
                get("/operations-board")
                    .queryParam("date", "2026-06-01")
                    .queryParam("days", "7")
                    .header("Authorization", "Bearer " + hostAccessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartmentId").value("all"))
            .andExpect(jsonPath("$.date").value("2026-06-01"))
            .andExpect(jsonPath("$.days").value(7))
            .andExpect(jsonPath("$.timezone").value("America/Sao_Paulo"))
            .andExpect(jsonPath("$.checkIns.count").value(3))
            .andExpect(jsonPath("$.checkIns.reservations[0].rawSummary").value("Guest Carol"))
            .andExpect(jsonPath("$.checkIns.reservations[1].rawSummary").value("Guest Eve"))
            .andExpect(jsonPath("$.checkIns.reservations[2].rawSummary").value("Guest Alice"))
            .andExpect(jsonPath("$.checkOuts.count").value(1))
            .andExpect(jsonPath("$.checkOuts.reservations[0].rawSummary").value("Guest Dave"))
            .andExpect(jsonPath("$.inHouse.count").value(4))
            .andExpect(jsonPath("$.upcoming.count").value(1))
            .andExpect(jsonPath("$.upcoming.reservations[0].rawSummary").value("Guest Bob"))
            .andExpect(jsonPath("$.totals.checkIns").value(3))
            .andExpect(jsonPath("$.totals.checkOuts").value(1))
            .andExpect(jsonPath("$.totals.inHouse").value(4))
            .andExpect(jsonPath("$.totals.upcoming").value(1));

        // co_host with view access only to apartment1 and apartment2 excludes apartment3
        createCoHostMember(
            hostAccessToken,
            "cohost@example.com",
            apartment1Id,
            apartment2Id,
            apartment3Id
        );
        String coHostAccessToken = signIn("cohost@example.com", "secure-password");

        mockMvc
            .perform(
                get("/operations-board")
                    .queryParam("date", "2026-06-01")
                    .queryParam("days", "7")
                    .header("Authorization", "Bearer " + coHostAccessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.apartmentId").value("all"))
            .andExpect(jsonPath("$.checkIns.count").value(2))
            .andExpect(jsonPath("$.checkIns.reservations[0].rawSummary").value("Guest Carol"))
            .andExpect(jsonPath("$.checkIns.reservations[1].rawSummary").value("Guest Alice"))
            .andExpect(jsonPath("$.checkOuts.count").value(1))
            .andExpect(jsonPath("$.inHouse.count").value(3))
            .andExpect(jsonPath("$.upcoming.count").value(1))
            .andExpect(jsonPath("$.totals.checkIns").value(2))
            .andExpect(jsonPath("$.totals.checkOuts").value(1))
            .andExpect(jsonPath("$.totals.inHouse").value(3))
            .andExpect(jsonPath("$.totals.upcoming").value(1));
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

    @Test
    void autoSyncRespectsOneHourWindowSilenceRuleAndListsSyncNotifications() throws Exception {
        when(icalFeedClient.fetch(any())).thenReturn(ICS_TEXT);
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String icalSourceId = createIcalSource(accessToken, apartmentId);

        // 1. Initial auto-sync: source never synced -> syncs and creates 1 reservation (notable!)
        mockMvc
            .perform(
                post("/ical-sources/auto-sync")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sourcesChecked").value(1))
            .andExpect(jsonPath("$.sourcesSynced").value(1))
            .andExpect(jsonPath("$.notableRuns", hasSize(1)))
            .andExpect(jsonPath("$.notableRuns[0].reservationsCreated").value(1))
            .andExpect(jsonPath("$.notableRuns[0].reservationsCancelled").value(0))
            .andExpect(jsonPath("$.notableRuns[0].changes", hasSize(1)))
            .andExpect(jsonPath("$.notableRuns[0].changes[0].changeType").value("created"));

        // 2. Immediate second auto-sync within 1 hour -> 0 sources synced
        mockMvc
            .perform(
                post("/ical-sources/auto-sync")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sourcesChecked").value(1))
            .andExpect(jsonPath("$.sourcesSynced").value(0))
            .andExpect(jsonPath("$.notableRuns", hasSize(0)));

        // 3. Backdate last_success_at by 2 hours and sync unchanged feed -> Silence Rule (0 notableRuns)
        jdbcTemplate.update(
            "update ical_sources set last_success_at = ? where id = ?",
            java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(7200)),
            icalSourceId
        );

        mockMvc
            .perform(
                post("/ical-sources/auto-sync")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sourcesChecked").value(1))
            .andExpect(jsonPath("$.sourcesSynced").value(1))
            .andExpect(jsonPath("$.notableRuns", hasSize(0)));

        // 4. Backdate last_success_at by 2 hours and return a feed where booking-1 disappeared and booking-2 is created
        String updatedFeed = ICS_TEXT
            .replace("UID:booking-1", "UID:booking-2")
            .replace("Guest Maria", "Guest Carlos");
        when(icalFeedClient.fetch(any())).thenReturn(updatedFeed);
        jdbcTemplate.update(
            "update ical_sources set last_success_at = ? where id = ?",
            java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(7200)),
            icalSourceId
        );

        mockMvc
            .perform(
                post("/ical-sources/auto-sync")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sourcesChecked").value(1))
            .andExpect(jsonPath("$.sourcesSynced").value(1))
            .andExpect(jsonPath("$.notableRuns", hasSize(1)))
            .andExpect(jsonPath("$.notableRuns[0].reservationsCreated").value(1))
            .andExpect(jsonPath("$.notableRuns[0].reservationsCancelled").value(1))
            .andExpect(jsonPath("$.notableRuns[0].changes", hasSize(2)));

        // 5. GET /notifications/sync returns only the 2 notable runs (the silent update run is excluded)
        mockMvc
            .perform(
                get("/notifications/sync")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.notifications", hasSize(2)))
            .andExpect(jsonPath("$.notifications[0].apartmentId").value(apartmentId))
            .andExpect(jsonPath("$.notifications[0].apartmentName").value("Apto 204"));
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

    private void createCoHostMember(
        String accessToken,
        String email,
        String apartment1Id,
        String apartment2Id,
        String hiddenApartmentId
    ) throws Exception {
        mockMvc
            .perform(
                post("/team-members")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "%s",
                          "fullName": "Co Host",
                          "password": "secure-password",
                          "role": "co_host",
                          "apartmentPermissions": [
                            {
                              "apartmentId": "%s",
                              "canView": true,
                              "canUpdateTaskStatus": false,
                              "canManageIntegrations": false
                            },
                            {
                              "apartmentId": "%s",
                              "canView": true,
                              "canUpdateTaskStatus": false,
                              "canManageIntegrations": false
                            },
                            {
                              "apartmentId": "%s",
                              "canView": false,
                              "canUpdateTaskStatus": false,
                              "canManageIntegrations": false
                            }
                          ]
                        }
                        """.formatted(email, apartment1Id, apartment2Id, hiddenApartmentId)
                    )
            )
            .andExpect(status().isCreated());
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
