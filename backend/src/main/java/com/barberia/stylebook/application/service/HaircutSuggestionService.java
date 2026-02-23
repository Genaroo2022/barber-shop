package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.web.dto.HaircutSuggestionItemResponse;
import com.barberia.stylebook.web.dto.HaircutSuggestionResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class HaircutSuggestionService {
    private static final Pattern DATA_URL_PATTERN =
            Pattern.compile("^data:(image/[a-zA-Z0-9+.-]+);base64,(.+)$");

    private final RestClient restClient;
    private final String huggingFaceToken;
    private final String captionModel;
    private final boolean previewEnabled;
    private final String previewModel;
    private final int maxImageBytes;

    public HaircutSuggestionService(
            @Value("${app.ai.haircut.huggingface-token:}") String huggingFaceToken,
            @Value("${app.ai.haircut.caption-model:Salesforce/blip-image-captioning-base}") String captionModel,
            @Value("${app.ai.haircut.preview-enabled:true}") boolean previewEnabled,
            @Value("${app.ai.haircut.preview-model:Qwen/Qwen-Image-Edit}") String previewModel,
            @Value("${app.ai.haircut.max-image-bytes:3145728}") int maxImageBytes
    ) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api-inference.huggingface.co")
                .build();
        this.huggingFaceToken = huggingFaceToken == null ? "" : huggingFaceToken.trim();
        this.captionModel = captionModel == null ? "Salesforce/blip-image-captioning-base" : captionModel.trim();
        this.previewEnabled = previewEnabled;
        this.previewModel = previewModel == null ? "Qwen/Qwen-Image-Edit" : previewModel.trim();
        this.maxImageBytes = Math.max(256_000, maxImageBytes);
    }

    public HaircutSuggestionResponse suggestFromImage(String imageDataUrl) {
        if (!StringUtils.hasText(huggingFaceToken)) {
            throw new BusinessRuleException("La funcionalidad IA no esta configurada");
        }
        ParsedImage parsed = parseImageDataUrl(imageDataUrl);
        String caption = describeImage(parsed);
        List<HaircutSuggestionItemResponse> suggestions = buildSuggestions(caption);

        String previewImageDataUrl = null;
        String previewStyleName = null;
        String previewMessage = "Simulacion de referencia. El resultado final puede variar segun tecnica del barbero.";

        if (previewEnabled && !suggestions.isEmpty()) {
            previewStyleName = suggestions.getFirst().styleName();
            String prompt = buildPreviewPrompt(previewStyleName);
            previewImageDataUrl = generatePreviewImage(parsed, prompt);
            if (!StringUtils.hasText(previewImageDataUrl)) {
                previewMessage = "No se pudo generar la simulacion visual en este momento. Igual puedes usar las recomendaciones.";
            }
        } else {
            previewMessage = "Vista previa desactivada por configuracion del servidor.";
        }

        return new HaircutSuggestionResponse(
                caption,
                suggestions,
                previewImageDataUrl,
                previewStyleName,
                previewMessage
        );
    }

    private ParsedImage parseImageDataUrl(String imageDataUrl) {
        if (!StringUtils.hasText(imageDataUrl)) {
            throw new BusinessRuleException("Debes enviar una foto");
        }

        Matcher matcher = DATA_URL_PATTERN.matcher(imageDataUrl.trim());
        if (!matcher.matches()) {
            throw new BusinessRuleException("Formato de imagen invalido");
        }

        String mimeType = matcher.group(1);
        String base64 = matcher.group(2);
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException ex) {
            throw new BusinessRuleException("La imagen no se pudo procesar");
        }

        if (raw.length == 0) {
            throw new BusinessRuleException("La imagen no se pudo procesar");
        }

        if (raw.length > maxImageBytes) {
            throw new BusinessRuleException("La imagen es muy pesada. Usa una foto menor a 3 MB");
        }

        return new ParsedImage(raw, mimeType, base64);
    }

    private String describeImage(ParsedImage image) {
        try {
            JsonNode response = restClient.post()
                    .uri("/models/{model}", captionModel)
                    .header("Authorization", "Bearer " + huggingFaceToken)
                    .contentType(MediaType.parseMediaType(image.mimeType()))
                    .body(image.content())
                    .retrieve()
                    .body(JsonNode.class);

            String caption = extractCaption(response);
            if (!StringUtils.hasText(caption)) {
                throw new BusinessRuleException("No se pudo analizar la foto. Intenta nuevamente");
            }
            return caption.trim();
        } catch (BusinessRuleException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new BusinessRuleException("No se pudo conectar con el motor de IA. Intenta nuevamente");
        } catch (Exception ex) {
            throw new BusinessRuleException("No se pudo analizar la foto. Intenta nuevamente");
        }
    }

    private String extractCaption(JsonNode response) {
        if (response == null || response.isNull()) {
            return "";
        }
        if (response.isArray() && !response.isEmpty()) {
            JsonNode first = response.get(0);
            if (first != null && first.hasNonNull("generated_text")) {
                return first.get("generated_text").asText("");
            }
        }
        if (response.hasNonNull("generated_text")) {
            return response.get("generated_text").asText("");
        }
        if (response.hasNonNull("error")) {
            throw new BusinessRuleException("No se pudo analizar la foto en este momento");
        }
        return "";
    }

    private List<HaircutSuggestionItemResponse> buildSuggestions(String caption) {
        String text = caption.toLowerCase(Locale.ROOT);
        Set<HaircutSuggestionItemResponse> ordered = new LinkedHashSet<>();

        if (containsAny(text, "curly", "wavy", "rizado", "ondulado")) {
            ordered.add(new HaircutSuggestionItemResponse(
                    "Curly Top Fade",
                    "Aprovecha la textura natural y limpia laterales para definir el rostro",
                    "Repaso cada 2-3 semanas"
            ));
        }

        if (containsAny(text, "beard", "barba", "facial hair")) {
            ordered.add(new HaircutSuggestionItemResponse(
                    "Mid Fade + Barba Degradada",
                    "Integra corte y barba para una silueta mas prolija y armonica",
                    "Perfilado semanal de barba"
            ));
        }

        if (containsAny(text, "long hair", "cabello largo", "long")) {
            ordered.add(new HaircutSuggestionItemResponse(
                    "Undercut con Largo Superior",
                    "Mantiene largo arriba y reduce volumen lateral para estilizar",
                    "Ajuste cada 3-4 semanas"
            ));
        }

        if (containsAny(text, "short hair", "cabello corto", "short")) {
            ordered.add(new HaircutSuggestionItemResponse(
                    "French Crop Texturizado",
                    "Es facil de mantener y aporta estructura sin exigir peinado complejo",
                    "Mantenimiento bajo"
            ));
        }

        ordered.add(new HaircutSuggestionItemResponse(
                "Low Taper Clasico",
                "Es versatil y favorece la mayoria de tipos de rostro",
                "Repaso cada 2-3 semanas"
        ));
        ordered.add(new HaircutSuggestionItemResponse(
                "Side Part Moderno",
                "Da una imagen prolija y funciona bien tanto formal como casual",
                "Peinado rapido con cera ligera"
        ));
        ordered.add(new HaircutSuggestionItemResponse(
                "Fade Medio Texturizado",
                "Equilibra volumen y limpieza para destacar facciones",
                "Repaso cada 2 semanas"
        ));

        List<HaircutSuggestionItemResponse> top3 = new ArrayList<>(ordered);
        if (top3.size() > 3) {
            return top3.subList(0, 3);
        }
        return top3;
    }

    private String buildPreviewPrompt(String styleName) {
        return "High-end barbershop hairstyle simulation. "
                + "Edit this real selfie while preserving the exact same person, facial identity, face structure, "
                + "eye shape, eyebrows, nose, lips, skin tone, age, expression, pose and background. "
                + "Apply hairstyle: " + styleName + ". "
                + "Make a realistic modern barber finish with clean fade transitions, natural hairline, "
                + "accurate clipper blending, realistic texture and strand detail. "
                + "Photo-realistic DSLR look, natural lighting, sharp focus, high detail, no text, no watermark.";
    }

    private String generatePreviewImage(ParsedImage image, String prompt) {
        try {
            byte[] rawResponse = restClient.post()
                    .uri("/models/{model}", previewModel)
                    .header("Authorization", "Bearer " + huggingFaceToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.IMAGE_JPEG, MediaType.IMAGE_PNG, MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "inputs", image.base64(),
                            "parameters", Map.of(
                                    "prompt", prompt,
                                    "negative_prompt", "blurry, cartoon, anime, painting, plastic skin, overprocessed, "
                                            + "deformed face, changed identity, wrong eyes, extra limbs, duplicated face, "
                                            + "unnatural hairline, unrealistic fade, watermark, text, logo",
                                    "guidance_scale", 7.5,
                                    "num_inference_steps", 25
                            )
                    ))
                    .retrieve()
                    .body(byte[].class);

            if (rawResponse == null || rawResponse.length == 0) {
                return null;
            }

            if (isJsonPayload(rawResponse)) {
                return null;
            }

            String base64 = Base64.getEncoder().encodeToString(rawResponse);
            return "data:image/jpeg;base64," + base64;
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean isJsonPayload(byte[] payload) {
        int first = firstNonWhitespace(payload);
        if (first < 0) {
            return false;
        }
        byte marker = payload[first];
        return marker == '{' || marker == '[';
    }

    private int firstNonWhitespace(byte[] payload) {
        for (int i = 0; i < payload.length; i += 1) {
            if (!Character.isWhitespace(payload[i])) {
                return i;
            }
        }
        return -1;
    }

    private boolean containsAny(String source, String... terms) {
        for (String term : terms) {
            if (source.contains(term)) {
                return true;
            }
        }
        return false;
    }

    private record ParsedImage(byte[] content, String mimeType, String base64) {
    }
}
