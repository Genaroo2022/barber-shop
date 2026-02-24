package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.WhatsAppAutoReplyService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/webhooks/whatsapp")
public class WhatsAppWebhookController {
    private final WhatsAppAutoReplyService whatsAppAutoReplyService;
    private final ObjectMapper objectMapper;

    public WhatsAppWebhookController(
            WhatsAppAutoReplyService whatsAppAutoReplyService,
            ObjectMapper objectMapper
    ) {
        this.whatsAppAutoReplyService = whatsAppAutoReplyService;
        this.objectMapper = objectMapper;
    }

    @GetMapping(produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> verify(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String verifyToken,
            @RequestParam(name = "hub.challenge", required = false) String challenge
    ) {
        if (!"subscribe".equals(mode) || !whatsAppAutoReplyService.isVerificationTokenValid(verifyToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("forbidden");
        }
        return ResponseEntity.ok(challenge == null ? "" : challenge);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> receive(
            @RequestHeader(name = "X-Hub-Signature-256", required = false) String signatureHeader,
            @RequestBody String payload
    ) {
        if (!whatsAppAutoReplyService.isWebhookSignatureValid(payload, signatureHeader)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        JsonNode jsonPayload;
        try {
            jsonPayload = objectMapper.readTree(payload);
        } catch (JsonProcessingException ex) {
            return ResponseEntity.badRequest().build();
        }
        whatsAppAutoReplyService.processIncomingWebhook(jsonPayload);
        return ResponseEntity.ok().build();
    }
}
