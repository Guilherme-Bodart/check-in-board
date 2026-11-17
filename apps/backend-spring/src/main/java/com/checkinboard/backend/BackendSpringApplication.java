package com.checkinboard.backend;

import com.checkinboard.backend.config.AppProperties;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableConfigurationProperties(AppProperties.class)
public class BackendSpringApplication {

	public static void main(String[] args) {
		normalizePostgresDatabaseUrlIfPresent();
		SpringApplication.run(BackendSpringApplication.class, args);
	}

	private static void normalizePostgresDatabaseUrlIfPresent() {
		String rawUrl = System.getenv("DATABASE_URL");
		if (rawUrl == null || rawUrl.isBlank()) {
			rawUrl = System.getProperty("DATABASE_URL");
		}
		if (rawUrl == null || (!rawUrl.startsWith("postgresql://") && !rawUrl.startsWith("postgres://"))) {
			return;
		}
		try {
			URI uri = URI.create(rawUrl);
			String userInfo = uri.getRawUserInfo();
			if (userInfo != null && !userInfo.isBlank()) {
				int colonIndex = userInfo.indexOf(':');
				String username = colonIndex >= 0 ? userInfo.substring(0, colonIndex) : userInfo;
				String password = colonIndex >= 0 ? userInfo.substring(colonIndex + 1) : "";
				if (System.getProperty("DATABASE_USERNAME") == null && System.getenv("DATABASE_USERNAME") == null) {
					System.setProperty("DATABASE_USERNAME", URLDecoder.decode(username, StandardCharsets.UTF_8));
				}
				if (System.getProperty("DATABASE_PASSWORD") == null && System.getenv("DATABASE_PASSWORD") == null) {
					System.setProperty("DATABASE_PASSWORD", URLDecoder.decode(password, StandardCharsets.UTF_8));
				}
			}
			int port = uri.getPort() > 0 ? uri.getPort() : 5432;
			String query = uri.getRawQuery();
			String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getRawPath()
				+ (query != null && !query.isBlank() ? "?" + query : "");
			System.setProperty("DATABASE_URL", jdbcUrl);
		} catch (IllegalArgumentException ignored) {
			// Keep original DATABASE_URL if parsing fails
		}
	}

}
