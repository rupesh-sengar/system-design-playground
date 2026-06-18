package com.systemdesign.platform.automation.pages;

import com.systemdesign.platform.automation.config.SignupCredentials;
import com.systemdesign.platform.automation.config.TestConfig;
import java.util.List;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public final class Auth0SignupPage {
    private static final List<By> EMAIL_INPUTS = List.of(
            By.cssSelector("input[name='email']"),
            By.cssSelector("input#email"),
            By.cssSelector("input[type='email']"),
            By.cssSelector("input[name='username']"),
            By.cssSelector("input#username")
    );
    private static final List<By> PASSWORD_INPUTS = List.of(
            By.cssSelector("input[name='password']"),
            By.cssSelector("input#password"),
            By.cssSelector("input[type='password']")
    );
    private static final By SIGNUP_SWITCH = By.xpath(
            "//a[normalize-space(.)='Sign up' or normalize-space(.)='Sign Up' or normalize-space(.)='Create account']" +
                    "|//button[not(@type='submit') and (normalize-space(.)='Sign up' or normalize-space(.)='Sign Up' or normalize-space(.)='Create account')]"
    );
    private static final By SUBMIT_BUTTON = By.cssSelector("button[type='submit'], input[type='submit']");

    private final WebDriver driver;
    private final WebDriverWait wait;
    private final TestConfig config;

    public Auth0SignupPage(WebDriver driver, WebDriverWait wait, TestConfig config) {
        this.driver = driver;
        this.wait = wait;
        this.config = config;
    }

    public void completeSignup(SignupCredentials credentials) {
        wait.until(webDriver -> currentUrl().contains(config.auth0Domain()));
        openSignupModeIfNeeded();

        WebElement emailInput = waitForVisible(EMAIL_INPUTS);
        replaceValue(emailInput, credentials.email());

        WebElement passwordInput = firstVisible(PASSWORD_INPUTS);
        if (passwordInput == null) {
            clickSubmit();
            passwordInput = waitForVisible(PASSWORD_INPUTS);
        }

        replaceValue(passwordInput, credentials.password());
        clickSubmit();
    }

    private void openSignupModeIfNeeded() {
        WebElement signupSwitch = firstVisible(SIGNUP_SWITCH);
        if (signupSwitch != null) {
            signupSwitch.click();
            wait.until(webDriver -> firstVisible(EMAIL_INPUTS) != null || firstVisible(PASSWORD_INPUTS) != null);
        }
    }

    private WebElement waitForVisible(List<By> locators) {
        return wait.until(webDriver -> firstVisible(locators));
    }

    private WebElement firstVisible(By locator) {
        return firstVisible(List.of(locator));
    }

    private WebElement firstVisible(List<By> locators) {
        for (By locator : locators) {
            List<WebElement> elements = driver.findElements(locator);

            for (WebElement element : elements) {
                if (element.isDisplayed()) {
                    return element;
                }
            }
        }

        return null;
    }

    private void replaceValue(WebElement input, String value) {
        input.click();
        input.clear();
        input.sendKeys(value);
    }

    private void clickSubmit() {
        WebElement submitButton = wait.until(ExpectedConditions.elementToBeClickable(SUBMIT_BUTTON));
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({ block: 'center' });", submitButton);
        submitButton.click();
    }

    private String currentUrl() {
        String currentUrl = driver.getCurrentUrl();

        return currentUrl == null ? "" : currentUrl;
    }
}
