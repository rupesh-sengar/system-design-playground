package com.systemdesign.platform.automation.tests;

import com.systemdesign.platform.automation.config.TestConfig;
import com.systemdesign.platform.automation.driver.WebDriverFactory;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.ITestContext;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

public abstract class BaseUiTest {
    protected TestConfig config;
    protected WebDriver driver;
    protected ITestContext testContext;
    protected WebDriverWait wait;

    @BeforeMethod(alwaysRun = true)
    public void setUpDriver(ITestContext context) {
        testContext = context;
        config = TestConfig.fromTestContext(context);
        driver = WebDriverFactory.create(config);
        wait = new WebDriverWait(driver, config.timeout());
    }

    @AfterMethod(alwaysRun = true)
    public void tearDownDriver() {
        if (driver != null) {
            driver.quit();
            driver = null;
        }
        testContext = null;
    }

    public WebDriver getDriver() {
        return driver;
    }
}
