/**
 * Token Encryption Utilities
 *
 * Provides JWE (JSON Web Encryption) functions for encrypting sensitive
 * data like Plaid access tokens at rest. Uses A256GCM algorithm.
 *
 * COMPONENT NOTE: Encryption key is passed as parameter, not read from process.env.
 * This enables component isolation - the host app provides the key.
 *
 * @see https://github.com/panva/jose
 */
/**
 * Error thrown when token decryption fails.
 *
 * This error intentionally hides internal crypto details to prevent
 * information leakage that could aid attackers.
 */
export declare class TokenDecryptionError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
/**
 * Decryption error codes.
 * These are safe to expose and help with debugging without leaking crypto details.
 */
export declare const DecryptionErrorCode: {
    readonly INVALID_FORMAT: "INVALID_TOKEN_FORMAT";
    readonly INVALID_KEY: "INVALID_ENCRYPTION_KEY";
    readonly DECRYPTION_FAILED: "DECRYPTION_FAILED";
};
/**
 * Check if a string is an encrypted JWE token.
 *
 * JWE compact format has exactly 5 parts separated by dots:
 * header.encrypted_key.iv.ciphertext.tag
 *
 * For "dir" (direct encryption), encrypted_key is empty but the dot is still present.
 *
 * @param value - The string to check
 * @returns true if the string appears to be a JWE
 */
export declare function isEncryptedToken(value: string): boolean;
/**
 * Encrypt a plaintext string using JWE compact serialization.
 *
 * @param plaintext - The string to encrypt (e.g., Plaid access token)
 * @param base64Key - Base64-encoded 32-byte encryption key
 * @returns JWE compact serialization string (5 dot-separated parts)
 */
export declare function encryptToken(plaintext: string, base64Key: string): Promise<string>;
/**
 * Decrypt a JWE compact serialization string.
 *
 * @param jwe - The encrypted JWE string
 * @param base64Key - Base64-encoded 32-byte encryption key
 * @returns Original plaintext string
 * @throws {TokenDecryptionError} If the token format is invalid, key is wrong, or decryption fails
 */
export declare function decryptToken(jwe: string, base64Key: string): Promise<string>;
//# sourceMappingURL=encryption.d.ts.map