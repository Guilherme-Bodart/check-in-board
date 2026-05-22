package com.checkinboard.backend.modules.tasks;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
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
class TaskControllerTest {

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
    void createsListsAndShowsTodayTask() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/tasks", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "Buy coffee filters",
                          "description": "For tomorrow checkout prep",
                          "dueAt": "2099-05-21T16:30:00.000Z"
                        }
                        """
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.task.id", notNullValue()))
            .andExpect(jsonPath("$.task.apartmentId").value(apartmentId))
            .andExpect(jsonPath("$.task.apartmentName").value("Apto 204"))
            .andExpect(jsonPath("$.task.title").value("Buy coffee filters"))
            .andExpect(jsonPath("$.task.status").value("pending"));

        mockMvc
            .perform(
                get("/apartments/{apartmentId}/tasks", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tasks", hasSize(1)))
            .andExpect(jsonPath("$.tasks[0].title").value("Buy coffee filters"));

        mockMvc
            .perform(
                get("/tasks/today")
                    .queryParam("date", "2099-05-21")
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.date").value("2099-05-21"))
            .andExpect(jsonPath("$.boardItems", hasSize(1)))
            .andExpect(jsonPath("$.boardItems[0].kind").value("task"))
            .andExpect(jsonPath("$.boardItems[0].headline").value("Buy coffee filters"));
    }

    @Test
    void letsTaskUpdaterMarkTaskDone() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String taskId = createTask(accessToken, apartmentId, "Restock soap");
        String userId = userIdByEmail("host@example.com");

        jdbcTemplate.update(
            """
            update apartment_memberships
            set role = 'team', can_update_task_status = true
            where apartment_id = ? and user_id = ?
            """,
            apartmentId,
            userId
        );

        mockMvc
            .perform(
                patch("/tasks/{taskId}/status", taskId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "status": "done"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.task.status").value("done"))
            .andExpect(jsonPath("$.task.completedByUserId").value(userId))
            .andExpect(jsonPath("$.task.completedAt", notNullValue()));
    }

    @Test
    void requiresNoteWhenMarkingTaskNotDone() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String taskId = createTask(accessToken, apartmentId, "Inspect leak");

        mockMvc
            .perform(
                patch("/tasks/{taskId}/status", taskId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "status": "not_done"
                        }
                        """
                    )
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    void rejectsTaskCreationWithoutHostAdminRole() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String apartmentId = createApartment(accessToken, "Apto 204");
        String userId = userIdByEmail("host@example.com");

        jdbcTemplate.update(
            """
            update apartment_memberships
            set role = 'team', can_update_task_status = true
            where apartment_id = ? and user_id = ?
            """,
            apartmentId,
            userId
        );

        mockMvc
            .perform(
                post("/apartments/{apartmentId}/tasks", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "Buy towels",
                          "dueAt": "2099-05-21T16:30:00.000Z"
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    private String createTask(String accessToken, String apartmentId, String title)
        throws Exception {
        MvcResult result = mockMvc
            .perform(
                post("/apartments/{apartmentId}/tasks", apartmentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "title": "%s",
                          "dueAt": "2099-05-21T16:30:00.000Z"
                        }
                        """.formatted(title)
                    )
            )
            .andExpect(status().isCreated())
            .andReturn();

        return readJson(result).get("task").get("id").asText();
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
