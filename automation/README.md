# UI Automation

Java Selenium tests for the System Design Platform UI.

## Prerequisites

- JDK 17+
- Maven 3.9+
- Chrome installed locally
- Frontend dev server running with Auth0 enabled

From the repo root, start the frontend in another terminal:

```sh
cd frontend
npm run dev:local
```

Then run the default smoke suite:

```sh
cd automation
mvn test
```

Suite runs:

```sh
mvn test -Psmoke
mvn test -Pauth
mvn test -Pregression
mvn test -DsuiteXmlFile=suites/auth.xml
```

Useful overrides:

```sh
mvn test -Pauth -Dapp.baseUrl=http://localhost:5173
mvn test -Pauth -Dbrowser=firefox
mvn test -Pauth -Dheadless=true
mvn test -Pauth -Dauth0.domain=login.systemdesignpark.com
mvn test -Pauth -Dsignup.email=your-test-inbox@example.com -Dsignup.password='Use-a-strong-test-password-123!'
```

## Current Coverage

- Signup from setup/onboarding through Auth0 Universal Login.

The signup test submits the Auth0 signup form. By default it generates a unique
Gmail plus-address under `rupeshsengar27898@gmail.com`, for example
`rupeshsengar27898+system-design-lab-...@gmail.com`, and generates a strong
password. If your Auth0 tenant requires email verification, the test treats the
verification prompt as the terminal state.

## TestNG Suite Structure

- `suites/smoke.xml`: fast confidence checks, runs tests tagged `smoke`.
- `suites/auth.xml`: authentication flows, runs tests tagged `auth`.
- `suites/regression.xml`: full application regression, runs tests tagged `regression`.

Each suite owns shared parameters such as `appBaseUrl`, `auth0Domain`,
`browser`, `headless`, and `timeoutSeconds`. Maven `-D` properties override
suite parameters, and environment variables override suite parameters too.

## Expansion Pattern

- Put browser/session setup in `tests/BaseUiTest`.
- Put shared browser creation in `driver/WebDriverFactory`.
- Put screen-specific behavior in `pages/*Page`.
- Put reusable assertions in `support/*Assertions`.
- Tag new TestNG tests with groups such as `smoke`, `auth`, `billing`,
  `library`, `playground`, and `regression`.

Failure screenshots are written to `automation/target/failure-artifacts/`.
