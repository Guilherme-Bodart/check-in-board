package com.checkinboard.backend.modules.owners;

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
class OwnerControllerTest {

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
    void listsDefaultInternalOwnerAfterSignUp() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");

        mockMvc
            .perform(get("/owners").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.owners", hasSize(1)))
            .andExpect(jsonPath("$.owners[0].name").value("Host Ops - Imoveis proprios"))
            .andExpect(jsonPath("$.owners[0].type").value("internal"))
            .andExpect(jsonPath("$.owners[0].apartmentCount").value(0));
    }

    @Test
    void createsUpdatesAndDeletesClientOwner() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");

        MvcResult result = mockMvc
            .perform(
                post("/owners")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Cliente Joao",
                          "type": "client",
                          "contactName": "Joao Silva",
                          "email": "joao@example.com",
                          "phone": "+55 11 99999-0000",
                          "notes": "Cliente com dois apartamentos"
                        }
                        """
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.owner.id", notNullValue()))
            .andExpect(jsonPath("$.owner.name").value("Cliente Joao"))
            .andExpect(jsonPath("$.owner.type").value("client"))
            .andExpect(jsonPath("$.owner.contactName").value("Joao Silva"))
            .andReturn();

        String ownerId = readJson(result).get("owner").get("id").asText();

        mockMvc
            .perform(
                put("/owners/{ownerId}", ownerId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Cliente Joao Atualizado",
                          "type": "client",
                          "contactName": "Joao Silva",
                          "email": "joao.updated@example.com",
                          "phone": "+55 11 98888-0000",
                          "notes": "Atualizado"
                        }
                        """
                    )
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.owner.name").value("Cliente Joao Atualizado"))
            .andExpect(jsonPath("$.owner.email").value("joao.updated@example.com"));

        mockMvc
            .perform(
                delete("/owners/{ownerId}", ownerId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isNoContent());

        mockMvc
            .perform(get("/owners").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.owners", hasSize(1)));
    }

    @Test
    void rejectsDeletingOwnerWithApartments() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String ownerId = firstOwnerId(accessToken);
        createApartment(accessToken, "Apto 204");

        mockMvc
            .perform(
                delete("/owners/{ownerId}", ownerId)
                    .header("Authorization", "Bearer " + accessToken)
            )
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("OWNER_HAS_APARTMENTS"));
    }

    @Test
    void rejectsOwnerCreationForNonHostAdmin() throws Exception {
        String accessToken = signUpHost("cohost@example.com", "Host Ops");
        String userId = userIdByEmail("cohost@example.com");
        jdbcTemplate.update(
            "update organization_memberships set role = 'co_host' where user_id = ?",
            userId
        );

        mockMvc
            .perform(
                post("/owners")
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "name": "Cliente Joao",
                          "type": "client"
                        }
                        """
                    )
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void rejectsCrossOrganizationOwnerAccess() throws Exception {
        String accessToken = signUpHost("host@example.com", "Host Ops");
        String ownerId = firstOwnerId(accessToken);
        String otherAccessToken = signUpHost("other@example.com", "Other Ops");

        mockMvc
            .perform(
                get("/owners/{ownerId}", ownerId)
                    .header("Authorization", "Bearer " + otherAccessToken)
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
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

    private String firstOwnerId(String accessToken) throws Exception {
        MvcResult result = mockMvc
            .perform(get("/owners").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andReturn();

        return readJson(result).get("owners").get(0).get("id").asText();
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
