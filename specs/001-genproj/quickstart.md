# Quickstart: Secure Authentication Token Storage and Reuse

This guide provides a quick overview of how to leverage the secure authentication token storage and reuse feature within the Project Generation Tool. This feature aims to streamline the project generation process by allowing users to store authentication tokens for external services (e.g., CircleCI, Doppler, SonarCloud) and reuse them for future projects, reducing repetitive authentication steps.

## Overview

Upon successful authentication with an external service during project generation, the system will securely store the obtained authentication token. For subsequent project generations requiring the same service, the stored token will be automatically used, eliminating the need for re-authentication. Users will also have the ability to view and revoke their stored tokens through a dedicated interface.

## Key Features

-   **Automated Token Storage**: Authentication tokens for external services are securely stored after initial successful authentication.
-   **Seamless Token Reuse**: Stored tokens are automatically utilized for future project generations, enhancing user experience.
-   **Secure Storage**: Tokens are encrypted at rest and managed with robust security practices.
-   **User Management Interface**: Users can view which services have stored tokens and can revoke them as needed.

## Getting Started

### 1. Initial Project Generation with External Services

When generating a new project that requires integration with external services (e.g., CircleCI, Doppler, SonarCloud):

-   Proceed through the project configuration and preview steps.
-   Upon clicking "Generate Project," you will be prompted to authenticate with the necessary external services.
-   After successful authentication, the system will securely store the tokens for these services.

### 2. Subsequent Project Generation

For any future project generation that requires an external service for which you have a stored token:

-   The system will automatically attempt to use the stored token for authentication.
-   If the token is valid, the project generation will proceed without requiring you to re-authenticate for that specific service.
-   If a stored token is expired or invalid, you will be prompted to re-authenticate.

### 3. Managing Stored Tokens

A user interface will be available to manage your stored tokens:

-   Navigate to your user settings or profile section within the Project Generation Tool.
-   You will see a list of external services for which you have stored tokens.
-   For each service, you will have the option to **revoke** the stored token. Revoking a token will require you to re-authenticate the next time that service is needed for project generation.

## Security Considerations

-   All stored tokens are encrypted at rest using Node.js crypto modules and stored in Cloudflare D1.
-   Decryption keys are managed securely as environment variables on the server.
-   Client-side authentication (e.g., session management) uses HTTP-only, secure, and SameSite cookies to protect against XSS and CSRF attacks.
-   Users are encouraged to regularly review and revoke tokens that are no longer needed.

This quickstart provides a high-level overview. For detailed API specifications, refer to `contracts/api.yaml`.