package com.systemdesign.platform.automation.driver;

import com.systemdesign.platform.automation.config.TestConfig;
import java.util.Locale;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;

public final class WebDriverFactory {
    private WebDriverFactory() {
    }

    public static WebDriver create(TestConfig config) {
        return switch (config.browser().toLowerCase(Locale.ROOT)) {
            case "chrome" -> new ChromeDriver(chromeOptions(config));
            case "firefox" -> new FirefoxDriver(firefoxOptions(config));
            default -> throw new IllegalArgumentException(
                    "Unsupported browser: " + config.browser() + ". Use chrome or firefox."
            );
        };
    }

    private static ChromeOptions chromeOptions(TestConfig config) {
        ChromeOptions options = new ChromeOptions();

        options.addArguments("--window-size=1440,1000");
        options.addArguments("--disable-dev-shm-usage");

        if (config.headless()) {
            options.addArguments("--headless=new");
        }

        return options;
    }

    private static FirefoxOptions firefoxOptions(TestConfig config) {
        FirefoxOptions options = new FirefoxOptions();

        options.addArguments("--width=1440");
        options.addArguments("--height=1000");

        if (config.headless()) {
            options.addArguments("--headless");
        }

        return options;
    }
}
