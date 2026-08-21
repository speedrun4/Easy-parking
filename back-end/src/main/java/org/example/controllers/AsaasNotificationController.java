package org.example.controllers;

import org.example.models.Pagamentos;
import org.example.repositories.PagamentoRepository;
import org.example.services.PagamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping({"/api/asaas/notifications", "/api/pagbank/notifications"})
public class AsaasNotificationController {

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private PagamentoService pagamentoService;

    @PostMapping
    public ResponseEntity<?> receiveNotification(@RequestBody Map<String, Object> payload) {
        try {
            Map<String, Object> paymentData = extractPaymentData(payload);
            if (paymentData == null || paymentData.isEmpty()) {
                return ResponseEntity.ok().build();
            }

            String paymentId = firstNonBlank(
                    readString(paymentData.get("id")),
                    readString(payload.get("id")),
                    readString(payload.get("charge_id"))
            );
            String externalReference = firstNonBlank(
                    readString(paymentData.get("externalReference")),
                    readString(paymentData.get("reference_id")),
                    readString(payload.get("externalReference")),
                    readString(payload.get("reference_id"))
            );
            String status = firstNonBlank(
                    readString(paymentData.get("status")),
                    readString(payload.get("status"))
            );

            Pagamentos pagamento = null;
            Long localPaymentId = extractPaymentId(externalReference);
            if (localPaymentId != null) {
                pagamento = pagamentoRepository.findById(localPaymentId).orElse(null);
            }
            if (pagamento == null && paymentId != null && !paymentId.trim().isEmpty()) {
                pagamento = pagamentoRepository.findByPagbankChargeId(paymentId.trim()).orElse(null);
            }

            if (pagamento != null) {
                java.util.Map<String, Object> normalized = new java.util.HashMap<String, Object>(paymentData);
                if (paymentId != null) {
                    normalized.put("id", paymentId);
                }
                if (externalReference != null) {
                    normalized.put("externalReference", externalReference);
                }
                if (status != null) {
                    normalized.put("status", status);
                }
                pagamentoService.applyAsaasPixResponse(pagamento, normalized);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Falha ao processar notificação do Asaas: " + e.getMessage());
        }
    }

    private Map<String, Object> extractPaymentData(Map<String, Object> payload) {
        Object payment = payload.get("payment");
        if (payment instanceof Map) {
            return (Map<String, Object>) payment;
        }
        Object eventData = payload.get("data");
        if (eventData instanceof Map) {
            Object nestedPayment = ((Map<?, ?>) eventData).get("payment");
            if (nestedPayment instanceof Map) {
                return (Map<String, Object>) nestedPayment;
            }
        }
        return payload;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) {
                return value.trim();
            }
        }
        return null;
    }

    private Long extractPaymentId(String referenceId) {
        try {
            if (referenceId == null) return null;
            String digits = referenceId.replaceAll("[^0-9]", "");
            if (digits.isEmpty()) return null;
            return Long.parseLong(digits);
        } catch (Exception e) {
            return null;
        }
    }

    private String readString(Object value) {
        return value != null ? value.toString() : null;
    }
}
