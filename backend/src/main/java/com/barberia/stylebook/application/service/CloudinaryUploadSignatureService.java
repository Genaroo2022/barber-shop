package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.web.dto.AdminGalleryUploadSignatureResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class CloudinaryUploadSignatureService {

    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;
    private final String uploadFolder;

    public CloudinaryUploadSignatureService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}") String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret,
            @Value("${app.cloudinary.upload-folder:stylebook/gallery}") String uploadFolder
    ) {
        this.cloudName = trimToEmpty(cloudName);
        this.apiKey = trimToEmpty(apiKey);
        this.apiSecret = trimToEmpty(apiSecret);
        this.uploadFolder = trimToEmpty(uploadFolder);
    }

    public AdminGalleryUploadSignatureResponse generateUploadSignature() {
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new BusinessRuleException("Cloudinary no esta configurado en backend");
        }

        long timestamp = Instant.now().getEpochSecond();
        Map<String, String> signableParams = new TreeMap<>();
        signableParams.put("timestamp", Long.toString(timestamp));
        if (!uploadFolder.isBlank()) {
            signableParams.put("folder", uploadFolder);
        }

        String paramString = signableParams.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        String signature = sha1Hex(paramString + apiSecret);

        return new AdminGalleryUploadSignatureResponse(
                cloudName,
                apiKey,
                timestamp,
                signature,
                uploadFolder.isBlank() ? null : uploadFolder
        );
    }

    private static String sha1Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo firmar upload de Cloudinary", ex);
        }
    }

    private static String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
