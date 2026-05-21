package com.checkinboard.backend.shared.crypto;

import com.checkinboard.backend.config.AppProperties;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class SecretEncryptionService {

    private static final String PREFIX = "v1:";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec encryptionKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public SecretEncryptionService(AppProperties appProperties) {
        encryptionKey = new SecretKeySpec(
            sha256(appProperties.icalUrlEncryptionKey()),
            "AES"
        );
    }

    public String encrypt(String value) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(
                Cipher.ENCRYPT_MODE,
                encryptionKey,
                new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );

            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            int tagLength = TAG_LENGTH_BITS / 8;
            int ciphertextLength = encrypted.length - tagLength;
            byte[] ciphertext = Arrays.copyOfRange(encrypted, 0, ciphertextLength);
            byte[] authTag = Arrays.copyOfRange(
                encrypted,
                ciphertextLength,
                encrypted.length
            );

            ByteBuffer payload = ByteBuffer.allocate(
                iv.length + authTag.length + ciphertext.length
            );
            payload.put(iv);
            payload.put(authTag);
            payload.put(ciphertext);

            return (
                PREFIX +
                Base64.getUrlEncoder().withoutPadding().encodeToString(payload.array())
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Secret encryption failed.", exception);
        }
    }

    public String decrypt(String encryptedValue) {
        if (encryptedValue == null || !encryptedValue.startsWith(PREFIX)) {
            throw new IllegalArgumentException("Unsupported encrypted secret format.");
        }

        try {
            byte[] payload = Base64
                .getUrlDecoder()
                .decode(encryptedValue.substring(PREFIX.length()));
            int tagLength = TAG_LENGTH_BITS / 8;
            int minimumPayloadLength = IV_LENGTH + tagLength + 1;

            if (payload.length < minimumPayloadLength) {
                throw new IllegalArgumentException("Encrypted secret payload is invalid.");
            }

            byte[] iv = Arrays.copyOfRange(payload, 0, IV_LENGTH);
            byte[] authTag = Arrays.copyOfRange(payload, IV_LENGTH, IV_LENGTH + tagLength);
            byte[] ciphertext = Arrays.copyOfRange(
                payload,
                IV_LENGTH + tagLength,
                payload.length
            );
            ByteBuffer encrypted = ByteBuffer.allocate(ciphertext.length + authTag.length);
            encrypted.put(ciphertext);
            encrypted.put(authTag);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(
                Cipher.DECRYPT_MODE,
                encryptionKey,
                new GCMParameterSpec(TAG_LENGTH_BITS, iv)
            );

            return new String(cipher.doFinal(encrypted.array()), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Secret decryption failed.", exception);
        }
    }

    private byte[] sha256(String value) {
        try {
            return MessageDigest
                .getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is required.", exception);
        }
    }
}
