package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class FirebaseIdentityService {
    private static final int HTTP_CONNECT_TIMEOUT_MS = 5_000;
    private static final int HTTP_READ_TIMEOUT_MS = 5_000;

    private final RestClient restClient;
    private final String firebaseApiKey;
    private final Set<String> allowedUids;

    public FirebaseIdentityService(
            @Value("${app.firebase.api-key:}") String firebaseApiKey,
            @Value("${app.firebase.allowed-uids:}") String allowedUidsRaw
    ) {
        this.restClient = RestClient.builder()
                .baseUrl("https://identitytoolkit.googleapis.com")
                .requestFactory(buildRequestFactory())
                .build();
        this.firebaseApiKey = firebaseApiKey;
        this.allowedUids = Arrays.stream(allowedUidsRaw.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .collect(Collectors.toSet());
    }

    public FirebaseIdentity lookupByIdToken(String idToken) {
        if (!StringUtils.hasText(firebaseApiKey)) {
            throw new BusinessRuleException("Autenticacion Firebase no configurada");
        }
        if (allowedUids.isEmpty()) {
            throw new BusinessRuleException("Autenticacion Firebase no configurada: faltan UIDs permitidos");
        }

        try {
            LookupResponse response = restClient.post()
                    .uri("/v1/accounts:lookup?key={key}", firebaseApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("idToken", idToken))
                    .retrieve()
                    .body(LookupResponse.class);

            if (response == null || response.users() == null || response.users().isEmpty()) {
                throw new BusinessRuleException("Usuario no encontrado");
            }

            LookupUser user = response.users().getFirst();
            if (Boolean.TRUE.equals(user.disabled())) {
                throw new BusinessRuleException("Usuario no encontrado");
            }

            return new FirebaseIdentity(user.localId(), user.email(), user.phoneNumber());
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 400 || ex.getStatusCode().value() == 401) {
                throw new BusinessRuleException("Credenciales invalidas");
            }
            throw new BusinessRuleException("No se pudo validar la identidad con Firebase");
        } catch (RestClientException ex) {
            throw new BusinessRuleException("No se pudo validar la identidad con Firebase");
        }
    }

    public boolean isUidAllowed(String uid) {
        return allowedUids.contains(uid);
    }

    public record FirebaseIdentity(String uid, String email, String phoneNumber) {
    }

    private record LookupResponse(List<LookupUser> users) {
    }

    private record LookupUser(String localId, String email, String phoneNumber, Boolean disabled) {
    }

    private static SimpleClientHttpRequestFactory buildRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(HTTP_READ_TIMEOUT_MS);
        return factory;
    }
}
