package com.systemdesign.platform.automation.config;

import java.time.Duration;
import java.util.Locale;
import org.testng.ITestContext;

public final class TestConfig {
    private static final String DEFAULT_BASE_URL = "http://localhost:5173";
    private static final String DEFAULT_AUTH0_DOMAIN = "login.systemdesignpark.com";
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(20);

    private final String appBaseUrl;
    private final String auth0Domain;
    private final String browser;
    private final boolean headless;
    private final Duration timeout;

    private TestConfig(
            String appBaseUrl,
            String auth0Domain,
            String browser,
            boolean headless,
            Duration timeout
    ) {
        this.appBaseUrl = normalizeBaseUrl(appBaseUrl);
        this.auth0Domain = normalizeDomain(auth0Domain);
        this.browser = browser.trim().toLowerCase(Locale.ROOT);
        this.headless = headless;
        this.timeout = timeout;
    }

    public static TestConfig fromSystemProperties() {
        return new TestConfig(
                System.getProperty("app.baseUrl", DEFAULT_BASE_URL),
                System.getProperty("auth0.domain", DEFAULT_AUTH0_DOMAIN),
                System.getProperty("browser", "chrome"),
                Boolean.parseBoolean(System.getProperty("headless", "false")),
                parseTimeout(System.getProperty("ui.timeout.seconds"))
        );
    }

    public static TestConfig fromTestContext(ITestContext context) {
        return new TestConfig(
                resolveConfigValue(context, "appBaseUrl", "app.baseUrl", "APP_BASE_URL", DEFAULT_BASE_URL),
                resolveConfigValue(context, "auth0Domain", "auth0.domain", "AUTH0_DOMAIN", DEFAULT_AUTH0_DOMAIN),
                resolveConfigValue(context, "browser", "browser", "BROWSER", "chrome"),
                Boolean.parseBoolean(resolveConfigValue(context, "headless", "headless", "HEADLESS", "false")),
                parseTimeout(resolveConfigValue(
                        context,
                        "timeoutSeconds",
                        "ui.timeout.seconds",
                        "UI_TIMEOUT_SECONDS",
                        String.valueOf(DEFAULT_TIMEOUT.toSeconds())
                ))
        );
    }

    public String appBaseUrl() {
        return appBaseUrl;
    }

    public String auth0Domain() {
        return auth0Domain;
    }

    public String browser() {
        return browser;
    }

    public boolean headless() {
        return headless;
    }

    public Duration timeout() {
        return timeout;
    }

    public String hashRouteUrl(String hashRoute) {
        String normalizedHash = hashRoute.startsWith("#") ? hashRoute : "#/" + hashRoute.replaceFirst("^/+", "");

        return appBaseUrl + "/" + normalizedHash;
    }

    private static String normalizeBaseUrl(String rawUrl) {
        String trimmedUrl = rawUrl.trim();

        while (trimmedUrl.endsWith("/")) {
            trimmedUrl = trimmedUrl.substring(0, trimmedUrl.length() - 1);
        }

        return trimmedUrl;
    }

    private static String normalizeDomain(String rawDomain) {
        String trimmedDomain = rawDomain.trim()
                .replaceFirst("^https?://", "");

        while (trimmedDomain.endsWith("/")) {
            trimmedDomain = trimmedDomain.substring(0, trimmedDomain.length() - 1);
        }

        return trimmedDomain;
    }

    private static String resolveConfigValue(
            ITestContext context,
            String testNgParameterName,
            String systemPropertyName,
            String environmentVariableName,
            String fallback
    ) {
        String systemPropertyValue = trimmedValue(System.getProperty(systemPropertyName));
        if (systemPropertyValue != null) {
            return systemPropertyValue;
        }

        String environmentValue = trimmedValue(System.getenv(environmentVariableName));
        if (environmentValue != null) {
            return environmentValue;
        }

        if (context != null && context.getCurrentXmlTest() != null) {
            String testNgParameterValue = trimmedValue(
                    context.getCurrentXmlTest().getParameter(testNgParameterName)
            );

            if (testNgParameterValue != null) {
                return testNgParameterValue;
            }
        }

        return fallback;
    }

    private static String trimmedValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private static Duration parseTimeout(String rawTimeoutSeconds) {
        if (rawTimeoutSeconds == null || rawTimeoutSeconds.isBlank()) {
            return DEFAULT_TIMEOUT;
        }

        long timeoutSeconds = Long.parseLong(rawTimeoutSeconds);

        if (timeoutSeconds <= 0) {
            throw new IllegalArgumentException("ui.timeout.seconds must be greater than zero.");
        }

        return Duration.ofSeconds(timeoutSeconds);
    }
}
