package org.example.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.models.Usuarios;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class MercadoPagoClient {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;

    @Value("${mercadopago.access-token:}")
    private String accessToken;

    @Value("${mercadopago.notification-url:}")
    private String notificationUrl;

    @Value("${mercadopago.payer-email:pagamentos@easyparking.local}")
    private String fallbackPayerEmail;

    public MercadoPagoClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public boolean hasConfiguredCredentials() {
        return accessToken != null && !accessToken.trim().isEmpty();
    }

    public Map<String, Object> createPixPayment(String externalReference,
                                                BigDecimal amount,
                                                String description,
                                                Usuarios usuario) throws Exception {
        if (!hasConfiguredCredentials()) {
            throw new IllegalStateException("Token de acesso do Mercado Pago não está configurado");
        }

        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("transaction_amount", normalizeAmount(amount));
        body.put("description", description);
        body.put("payment_method_id", "pix");
        body.put("external_reference", externalReference);
        body.put("date_of_expiration", OffsetDateTime.now(ZoneOffset.of("-03:00"))
                .plusMinutes(30)
                .truncatedTo(ChronoUnit.SECONDS)
                .toString());
        body.put("payer", buildPayer(usuario));

        if (shouldSendNotificationUrl()) {
            body.put("notification_url", notificationUrl.trim());
        }

        return exchange("/v1/payments", HttpMethod.POST, body, true);
    }

    public Map<String, Object> getPayment(String paymentId) throws Exception {
        if (!hasConfiguredCredentials()) {
            throw new IllegalStateException("Token de acesso do Mercado Pago não está configurado");
        }

        return exchange("/v1/payments/" + paymentId, HttpMethod.GET, null, false);
    }

    private Map<String, Object> buildPayer(Usuarios usuario) {
        Map<String, Object> payer = new LinkedHashMap<String, Object>();
        payer.put("email", resolvePayerEmail(usuario));

        if (usuario != null) {
            String nomeCompleto = usuario.getNomeCompleto() != null ? usuario.getNomeCompleto().trim() : "";
            if (!nomeCompleto.isEmpty()) {
                String[] nomePartes = nomeCompleto.split("\\s+", 2);
                payer.put("first_name", nomePartes[0]);
                if (nomePartes.length > 1 && !nomePartes[1].trim().isEmpty()) {
                    payer.put("last_name", nomePartes[1].trim());
                }
            }

            String cpf = usuario.getCpf() != null ? usuario.getCpf().replaceAll("\\D", "") : "";
            if (cpf.length() == 11) {
                Map<String, Object> identification = new LinkedHashMap<String, Object>();
                identification.put("type", "CPF");
                identification.put("number", cpf);
                payer.put("identification", identification);
            }
        }

        return payer;
    }

    private String resolvePayerEmail(Usuarios usuario) {
        if (usuario != null && isValidEmail(usuario.getEmail())) {
            return usuario.getEmail().trim();
        }
        if (isValidEmail(fallbackPayerEmail)) {
            return fallbackPayerEmail.trim();
        }
        return "pagamentos@easyparking.local";
    }

    private boolean isValidEmail(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim();
        return !normalized.isEmpty() && normalized.contains("@");
    }

    private boolean shouldSendNotificationUrl() {
        if (notificationUrl == null || notificationUrl.trim().isEmpty()) {
            return false;
        }
        String url = notificationUrl.trim().toLowerCase(Locale.ROOT);
        return url.startsWith("https://") && !url.contains("localhost") && !url.contains("127.0.0.1");
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        BigDecimal safeAmount = amount != null ? amount : BigDecimal.ONE;
        return safeAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private Map<String, Object> exchange(String path,
                                         HttpMethod method,
                                         Object body,
                                         boolean addIdempotencyKey) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(accessToken.trim());
        if (addIdempotencyKey) {
            headers.set("X-Idempotency-Key", UUID.randomUUID().toString());
        }

        HttpEntity<?> entity = body != null
                ? new HttpEntity<Object>(body, headers)
                : new HttpEntity<Object>(null, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    "https://api.mercadopago.com" + path,
                    method,
                    entity,
                    String.class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return MAPPER.readValue(response.getBody(), Map.class);
            }
            throw new RuntimeException("Falha na integração Mercado Pago: " + response.getStatusCode());
        } catch (HttpStatusCodeException ex) {
            throw new RuntimeException(
                    "Falha na integração Mercado Pago: " + ex.getStatusCode() + " - " + ex.getResponseBodyAsString(),
                    ex
            );
        }
    }
}
