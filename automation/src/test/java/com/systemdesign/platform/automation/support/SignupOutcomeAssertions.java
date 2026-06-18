package com.systemdesign.platform.automation.support;

import com.systemdesign.platform.automation.config.TestConfig;
import java.util.Locale;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;

public final class SignupOutcomeAssertions {
    private static final By BODY = By.tagName("body");

    private SignupOutcomeAssertions() {
    }

    public static void assertSignupSubmitted(WebDriver driver, TestConfig config) {
        WebDriverWait wait = new WebDriverWait(driver, config.timeout());

        boolean reachedTerminalState = wait.until(webDriver -> {
            String currentUrl = currentUrl(webDriver);

            if (currentUrl.startsWith(config.appBaseUrl())) {
                return true;
            }

            String pageText = webDriver.findElement(BODY).getText().toLowerCase(Locale.ROOT);

            return pageText.contains("check your email")
                    || pageText.contains("verify your email")
                    || pageText.contains("verification")
                    || pageText.contains("account has been created")
                    || pageText.contains("account created")
                    || pageText.contains("success");
        });

        Assert.assertTrue(
                reachedTerminalState,
                "Expected signup to return to the app or show an Auth0 signup completion state."
        );
    }

    private static String currentUrl(WebDriver driver) {
        String currentUrl = driver.getCurrentUrl();

        return currentUrl == null ? "" : currentUrl;
    }
}
