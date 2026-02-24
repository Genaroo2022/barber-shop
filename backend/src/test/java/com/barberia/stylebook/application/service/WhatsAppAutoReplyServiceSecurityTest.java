package com.barberia.stylebook.application.service;

import com.barberia.stylebook.repository.AppointmentRepository;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class WhatsAppAutoReplyServiceSecurityTest {

    private final AppointmentRepository appointmentRepository = mock(AppointmentRepository.class);

    @Test
    void webhookSignature_isRejectedWhenMissingHeader() {
        WhatsAppAutoReplyService service = new WhatsAppAutoReplyService(
                appointmentRepository,
                true,
                "verify-token",
                "app-secret",
                "phone-id",
                "token",
                90,
                720,
                "America/Argentina/Buenos_Aires"
        );

        assertFalse(service.isWebhookSignatureValid("{\"entry\":[]}", null));
    }

    @Test
    void webhookSignature_acceptsValidHeader() {
        String payload = "{\"entry\":[]}";
        String secret = "app-secret";
        WhatsAppAutoReplyService service = new WhatsAppAutoReplyService(
                appointmentRepository,
                true,
                "verify-token",
                secret,
                "phone-id",
                "token",
                90,
                720,
                "America/Argentina/Buenos_Aires"
        );

        String signature = "sha256=" + hmacSha256Hex(payload, secret);
        assertTrue(service.isWebhookSignatureValid(payload, signature));
    }

    @Test
    void webhookSignature_isBypassedWhenFeatureDisabled() {
        WhatsAppAutoReplyService service = new WhatsAppAutoReplyService(
                appointmentRepository,
                false,
                "verify-token",
                "",
                "",
                "",
                90,
                720,
                "America/Argentina/Buenos_Aires"
        );

        assertTrue(service.isWebhookSignatureValid("{\"entry\":[]}", null));
    }

    private static String hmacSha256Hex(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
