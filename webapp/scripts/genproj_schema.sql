CREATE TABLE IF NOT EXISTS UserStoredAuthToken (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    encryptedToken TEXT NOT NULL,
    encryptedRefreshToken TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    expiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    isRevoked BOOLEAN DEFAULT FALSE
);

-- Add index for userId for faster lookups
CREATE INDEX IF NOT EXISTS idx_userstoredauthtoken_userid ON UserStoredAuthToken (userId);

-- Add index for serviceName for faster lookups
CREATE INDEX IF NOT EXISTS idx_userstoredauthtoken_servicename ON UserStoredAuthToken (serviceName);