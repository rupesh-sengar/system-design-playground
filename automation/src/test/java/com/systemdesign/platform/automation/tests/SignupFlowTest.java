package com.systemdesign.platform.automation.tests;

import com.systemdesign.platform.automation.config.SignupCredentials;
import com.systemdesign.platform.automation.pages.Auth0SignupPage;
import com.systemdesign.platform.automation.pages.OnboardingPage;
import com.systemdesign.platform.automation.support.SignupOutcomeAssertions;
import org.testng.annotations.Test;

public final class SignupFlowTest extends BaseUiTest {
    @Test(
            groups = {"smoke", "auth", "signup", "regression"},
            description = "Setup signup creates an account through Auth0"
    )
    public void setupSignupCreatesAccountThroughAuth0() {
        SignupCredentials credentials = SignupCredentials.fromTestContext(testContext);
        OnboardingPage onboardingPage = new OnboardingPage(driver, wait, config);
        Auth0SignupPage auth0SignupPage = new Auth0SignupPage(driver, wait, config);

        onboardingPage.open();
        onboardingPage.startSignup();
        auth0SignupPage.completeSignup(credentials);

        SignupOutcomeAssertions.assertSignupSubmitted(driver, config);
    }
}
