package com.systemdesign.platform.automation.pages;

import com.systemdesign.platform.automation.config.TestConfig;
import java.time.Duration;
import java.util.List;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public final class OnboardingPage {
    private static final String TUTORIAL_SEEN_KEY = "system-design-lab.new-user-tutorial.seen.v1";
    private static final By PAGE_TITLE = By.xpath("//h1[normalize-space(.)='Build a starter path']");
    private static final By SIGNUP_AND_SAVE_BUTTON = By.xpath("//button[normalize-space(.)='Sign up and save']");
    private static final By DEVELOPMENT_NOTICE_CONFIRM = By.xpath("//button[normalize-space(.)='I understand']");
    private static final By TUTORIAL_CLOSE_BUTTON = By.cssSelector("button[aria-label='Close tutorial']");
    private static final By TUTORIAL_ROOT = By.cssSelector(".tutorial-tour");

    private final WebDriver driver;
    private final WebDriverWait wait;
    private final TestConfig config;

    public OnboardingPage(WebDriver driver, WebDriverWait wait, TestConfig config) {
        this.driver = driver;
        this.wait = wait;
        this.config = config;
    }

    public void open() {
        seedFirstRunState();
        driver.get(config.hashRouteUrl("#/onboarding"));
        wait.until(ExpectedConditions.visibilityOfElementLocated(PAGE_TITLE));
        closeTutorialIfPresent();
        dismissDevelopmentNoticeIfPresent();
    }

    public void startSignup() {
        closeTutorialIfPresent();
        WebElement signupButton = wait.until(ExpectedConditions.elementToBeClickable(SIGNUP_AND_SAVE_BUTTON));
        signupButton.click();
    }

    private void seedFirstRunState() {
        driver.get(config.appBaseUrl() + "/");
        ((JavascriptExecutor) driver).executeScript(
                "window.localStorage.setItem(arguments[0], 'true');",
                TUTORIAL_SEEN_KEY
        );
        driver.navigate().refresh();
        wait.until(webDriver -> "complete".equals(
                ((JavascriptExecutor) webDriver).executeScript("return document.readyState")
        ));
    }

    private void closeTutorialIfPresent() {
        WebDriverWait shortWait = new WebDriverWait(driver, Duration.ofSeconds(2));

        try {
            List<WebElement> closeButtons = shortWait.until(
                    webDriver -> {
                        List<WebElement> displayedButtons = webDriver.findElements(TUTORIAL_CLOSE_BUTTON)
                            .stream()
                            .filter(WebElement::isDisplayed)
                            .toList();

                        return displayedButtons.isEmpty() ? null : displayedButtons;
                    }
            );

            if (!closeButtons.isEmpty()) {
                closeButtons.get(0).click();
                wait.until(ExpectedConditions.invisibilityOfElementLocated(TUTORIAL_ROOT));
            }
        } catch (RuntimeException ignored) {
            // The tutorial is skipped by local storage, but this keeps the test resilient.
        }
    }

    private void dismissDevelopmentNoticeIfPresent() {
        WebDriverWait shortWait = new WebDriverWait(driver, Duration.ofSeconds(2));

        try {
            List<WebElement> confirmButtons = shortWait.until(
                    webDriver -> {
                        List<WebElement> displayedButtons = webDriver.findElements(DEVELOPMENT_NOTICE_CONFIRM)
                            .stream()
                            .filter(WebElement::isDisplayed)
                            .toList();

                        return displayedButtons.isEmpty() ? null : displayedButtons;
                    }
            );

            if (!confirmButtons.isEmpty()) {
                confirmButtons.get(0).click();
            }
        } catch (RuntimeException ignored) {
            // The notice is feature-flagged and is usually disabled in local test mode.
        }
    }
}
