# Data Model: User Stored Authentication Tokens

## Entity: `UserStoredAuthToken`

**Description**: Represents an authentication token for an external service, securely stored for a user to facilitate automatic re-authentication for future project generations. This entity will be stored in Cloudflare D1.

**Fields**:

-   `id`: `UUID` (Primary Key, unique identifier for the stored token)
-   `userId`: `UUID` (Foreign Key, references the authenticated User entity)
-   `serviceName`: `String` (Required, e.g., "CircleCI", "Doppler", "SonarCloud")
-   `encryptedToken`: `String` (Required, the encrypted authentication token string)
-   `encryptedRefreshToken`: `String` (Optional, the encrypted refresh token string for longer-lived access)
-   `createdAt`: `DateTime` (Required, timestamp of when the token record was created)
-   `updatedAt`: `DateTime` (Required, timestamp of the last update or use of the token)
-   `expiresAt`: `DateTime` (Optional, expiration timestamp of the `encryptedToken`. If present, the token should not be used after this time unless refreshed.)
-   `refreshTokenExpiresAt`: `DateTime` (Optional, expiration timestamp of the `encryptedRefreshToken`)
-   `isRevoked`: `Boolean` (Default: `false`, indicates if the token has been explicitly revoked by the user)

**Relationships**:

-   `UserStoredAuthToken` many-to-one with `User` (Each token record belongs to one user).

**Validation Rules (derived from Functional Requirements and Edge Cases)**:

-   `encryptedToken` MUST be encrypted using Node.js crypto modules before storage in D1 (FR-048).
-   `encryptedRefreshToken` (if present) MUST also be encrypted using Node.js crypto modules before storage in D1.
-   `userId` MUST link to a valid, existing user within the system.
-   `serviceName` MUST be one of the predefined and supported external services for project generation.
-   Tokens for which `isRevoked` is `true` SHOULD NOT be used for new authentications or token refreshes.
-   Tokens for which `expiresAt` has passed SHOULD NOT be used for authentication; a refresh attempt with `encryptedRefreshToken` or re-authentication is required.
-   `encryptedRefreshToken` MUST only be used to obtain new `encryptedToken`s, not directly for external service API calls.

**State Transitions**:

-   **`Authenticated` -> `TokenStored`**: Occurs upon successful authentication with an external service, and the user consents to store the token. A new `UserStoredAuthToken` record is created.
-   **`TokenStored` -> `TokenRefreshed`**: If an `encryptedRefreshToken` is available and valid, a new `encryptedToken` is obtained from the external service, and `encryptedToken`, `expiresAt`, and `updatedAt` fields are updated.
-   **`TokenStored` -> `TokenRevoked`**: User explicitly requests to revoke the token through the application's UI (FR-047). The `isRevoked` field is set to `true`.
-   **`TokenStored` -> `TokenExpired`**: The `expiresAt` timestamp passes. The token is no longer automatically usable for authentication without a refresh or re-authentication.

This data model supports the secure storage and management of external service authentication tokens, enabling a smoother user experience for project generation while adhering to security best practices.