package com.systemdesign.platform.automation.support;

import com.systemdesign.platform.automation.config.TestConfig;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;

public final class Auth0Assertions {
    private Auth0Assertions() {
    }

    public static void assertSignupHandoff(WebDriver driver, TestConfig config) {
        WebDriverWait wait = new WebDriverWait(driver, config.timeout());

        wait.until(webDriver -> currentUrl(webDriver).contains(config.auth0Domain()));

        String currentUrl = driver.getCurrentUrl();
        URI currentUri = URI.create(currentUrl);
        String decodedUrl = URLDecoder.decode(currentUrl, StandardCharsets.UTF_8);
        String normalizedPath = currentUri.getPath() == null
                ? ""
                : currentUri.getPath().toLowerCase(Locale.ROOT);
        boolean includesSignupHint = decodedUrl.contains("screen_hint=signup");
        boolean isAuth0SignupPage = normalizedPath.contains("signup");

        Assert.assertTrue(
                includesSignupHint || isAuth0SignupPage,
                "Expected Auth0 signup handoff, but landed on: " + currentUrl
        );
    }

    private static String currentUrl(WebDriver driver) {
        String currentUrl = driver.getCurrentUrl();

        return currentUrl == null ? "" : currentUrl;
    }
}
