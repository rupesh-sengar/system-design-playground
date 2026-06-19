package com.systemdesign.platform.automation.config;

import java.security.SecureRandom;
import java.time.Instant;
import org.testng.ITestContext;

public record SignupCredentials(String email, String password) {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String DEFAULT_EMAIL_LOCAL_PART = "rupeshsengar27898";
    private static final String DEFAULT_EMAIL_DOMAIN = "gmail.com";

    public static SignupCredentials fromSystemProperties() {
        String email = firstPresent(
                System.getProperty("signup.email"),
                System.getenv("SIGNUP_EMAIL")
        );
        String password = firstPresent(
                System.getProperty("signup.password"),
                System.getenv("SIGNUP_PASSWORD")
        );

        return new SignupCredentials(
                email == null ? generatedEmail() : email,
                password == null ? generatedPassword() : password
        );
    }

    public static SignupCredentials fromTestContext(ITestContext context) {
        String email = resolveCredentialValue(context, "signupEmail", "signup.email", "SIGNUP_EMAIL");
        String password = resolveCredentialValue(context, "signupPassword", "signup.password", "SIGNUP_PASSWORD");

        return new SignupCredentials(
                email == null ? generatedEmail() : email,
                password == null ? generatedPassword() : password
        );
    }

    private static String generatedEmail() {
        return DEFAULT_EMAIL_LOCAL_PART +"@" + DEFAULT_EMAIL_DOMAIN;
    }

    private static String generatedPassword() {
        return "Sdl@" + Instant.now().toEpochMilli() + "Aa#" + SECURE_RANDOM.nextInt(100_000);
    }

    private static String firstPresent(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first.trim();
        }

        if (second != null && !second.isBlank()) {
            return second.trim();
        }

        return null;
    }

    private static String resolveCredentialValue(
            ITestContext context,
            String testNgParameterName,
            String systemPropertyName,
            String environmentVariableName
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
            String testNgValue = trimmedValue(context.getCurrentXmlTest().getParameter(testNgParameterName));

            if (testNgValue != null) {
                return testNgValue;
            }
        }

        return null;
    }

    private static String trimmedValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
