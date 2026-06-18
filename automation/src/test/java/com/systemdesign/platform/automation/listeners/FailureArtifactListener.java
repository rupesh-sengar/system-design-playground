package com.systemdesign.platform.automation.listeners;

import com.systemdesign.platform.automation.tests.BaseUiTest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.testng.ITestListener;
import org.testng.ITestResult;
import org.testng.Reporter;

public final class FailureArtifactListener implements ITestListener {
    private static final Path ARTIFACT_DIRECTORY = Path.of("target", "failure-artifacts");
    private static final DateTimeFormatter TIMESTAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS");

    @Override
    public void onTestFailure(ITestResult result) {
        Object testInstance = result.getInstance();

        if (!(testInstance instanceof BaseUiTest baseUiTest)) {
            return;
        }

        WebDriver driver = baseUiTest.getDriver();
        if (!(driver instanceof TakesScreenshot screenshotDriver)) {
            return;
        }

        try {
            Files.createDirectories(ARTIFACT_DIRECTORY);
            Path screenshotPath = ARTIFACT_DIRECTORY.resolve(
                    safeFileName(result.getMethod().getMethodName())
                            + "-"
                            + TIMESTAMP_FORMAT.format(LocalDateTime.now())
                            + ".png"
            );

            Files.copy(screenshotDriver.getScreenshotAs(OutputType.FILE).toPath(), screenshotPath);
            Reporter.log("Saved failure screenshot: " + screenshotPath.toAbsolutePath(), true);
        } catch (IOException artifactError) {
            Reporter.log("Unable to save failure screenshot: " + artifactError.getMessage(), true);
        }
    }

    private static String safeFileName(String value) {
        return value.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
