package com.checkinboard.backend.modules.health;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.checkinboard.backend.BackendSpringApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = BackendSpringApplication.class)
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthReturnsServiceStatus() throws Exception {
        mockMvc
            .perform(get("/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.service").value("check-in-board-backend"))
            .andExpect(jsonPath("$.status").value("ok"))
            .andExpect(jsonPath("$.timestamp", notNullValue()));
    }

    @Test
    void actuatorHealthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void protectedEndpointsReturnStandardUnauthorizedError() throws Exception {
        mockMvc
            .perform(get("/apartments"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.error.message").value("Authentication is required."));
    }
}
