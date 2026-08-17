package org.example.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.models.Pagamentos;
import org.example.repositories.PagamentoRepository;
import org.example.services.MercadoPagoClient;
import org.example.services.PagamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/mercadopago/notifications")
public class MercadoPagoNotificationController {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Autowired
    private MercadoPagoClient mercadoPagoClient;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private PagamentoService pagamentoService;

    @PostMapping
    public ResponseEntity<?> receiveNotification(@RequestParam Map<String, String> params,
                                                 @RequestBody(required = false) String rawBody) {
        try {
            if (!mercadoPagoClient.hasConfiguredCredentials()) {
                return ResponseEntity.ok().build();
            }

            String paymentId = extractPaymentId(params, rawBody);
            if (paymentId == null || paymentId.trim().isEmpty()) {
                return ResponseEntity.ok().build();
            }

            Map<String, Object> payment = mercadoPagoClient.getPayment(paymentId.trim());
            String externalReference = stringValue(payment.get("external_reference"));

            Pagamentos pagamento = null;
            Long localPaymentId = extractLocalPaymentId(externalReference);
            if (localPaymentId != null) {
                pagamento = pagamentoRepository.findById(localPaymentId).orElse(null);
            }
            if (pagamento == null) {
                pagamento = pagamentoRepository.findByPagbankChargeId(paymentId.trim()).orElse(null);
            }

            if (pagamento != null) {
                pagamentoService.applyMercadoPagoPixResponse(pagamento, payment);
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Falha ao processar notificação do Mercado Pago: " + e.getMessage());
        }
    }

    private String extractPaymentId(Map<String, String> params, String rawBody) {
        String[] directKeys = new String[]{"data.id", "id"};
        for (String key : directKeys) {
            String value = params.get(key);
            if (value != null && !value.trim().isEmpty()) {
                return value;
            }
        }

        if (rawBody == null || rawBody.trim().isEmpty()) {
            return null;
        }

        try {
            Map<String, Object> payload = MAPPER.readValue(rawBody, Map.class);
            Object data = payload.get("data");
            if (data instanceof Map) {
                Object id = ((Map<?, ?>) data).get("id");
                if (id != null) {
                    return id.toString();
                }
            }

            Object id = payload.get("id");
            if (id != null) {
                return id.toString();
            }
        } catch (Exception ignored) {
            return null;
        }

        return null;
    }

    private Long extractLocalPaymentId(String externalReference) {
        try {
            if (externalReference == null) {
                return null;
            }
            String digits = externalReference.replaceAll("[^0-9]", "");
            if (digits.isEmpty()) {
                return null;
            }
            return Long.parseLong(digits);
        } catch (Exception e) {
            return null;
        }
    }

    private String stringValue(Object value) {
        return value != null ? value.toString() : null;
    }
}
