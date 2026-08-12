package org.example.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.repositories.PagamentoRepository;
import org.example.models.Pagamentos;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pagbank/notifications")
public class PagBankNotificationController {

    @Autowired
    private PagamentoRepository pagamentoRepository;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Endpoint para receber notificações do PagBank.
     * A estrutura exata do payload pode variar conforme API. Aqui fazemos o parse genérico
     * e tentamos atualizar o pagamento local com base em reference_id (se existir).
     */
    @PostMapping
    public ResponseEntity<?> receiveNotification(@RequestBody Map<String, Object> payload) {
        try {
            String status = extractStatus(payload);
            String referenceId = extractReferenceId(payload);
            String chargeId = extractChargeId(payload);

            Pagamentos pagamento = null;
            Long pagamentoId = extractPaymentId(referenceId);
            if (pagamentoId != null) {
                pagamento = pagamentoRepository.findById(pagamentoId).orElse(null);
            }

            if (pagamento == null && chargeId != null && !chargeId.trim().isEmpty()) {
                pagamento = pagamentoRepository.findByPagbankChargeId(chargeId).orElse(null);
            }

            if (pagamento != null && status != null && !status.trim().isEmpty()) {
                String normalizedStatus = status.trim().toUpperCase();
                pagamento.setPagbankStatus(normalizedStatus);
                if ("PAID".equalsIgnoreCase(normalizedStatus)
                        || "COMPLETED".equalsIgnoreCase(normalizedStatus)
                        || "CONFIRMED".equalsIgnoreCase(normalizedStatus)) {
                    pagamento.setStatus("pago");
                }
                pagamentoRepository.save(pagamento);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Falha ao processar notificação: " + e.getMessage());
        }
    }

    private String extractStatus(Map<String, Object> payload) {
        Object status = payload.get("status");
        if (status != null) {
            return status.toString();
        }

        Object chargeObj = payload.get("charge");
        if (chargeObj instanceof Map) {
            Object st = ((Map<?, ?>) chargeObj).get("status");
            if (st != null) {
                return st.toString();
            }
        }

        Object chargesObj = payload.get("charges");
        if (chargesObj instanceof java.util.List && !((java.util.List<?>) chargesObj).isEmpty()) {
            Object first = ((java.util.List<?>) chargesObj).get(0);
            if (first instanceof Map) {
                Object st = ((Map<?, ?>) first).get("status");
                if (st != null) {
                    return st.toString();
                }
            }
        }

        Object dataObj = payload.get("data");
        if (dataObj instanceof Map) {
            return extractStatus((Map<String, Object>) dataObj);
        }

        return null;
    }

    private String extractReferenceId(Map<String, Object> payload) {
        Object ref = payload.get("reference_id");
        if (ref != null) {
            return ref.toString();
        }

        Object chargeObj = payload.get("charge");
        if (chargeObj instanceof Map) {
            Object chargeRef = ((Map<?, ?>) chargeObj).get("reference_id");
            if (chargeRef != null) {
                return chargeRef.toString();
            }
        }

        Object chargesObj = payload.get("charges");
        if (chargesObj instanceof java.util.List && !((java.util.List<?>) chargesObj).isEmpty()) {
            Object first = ((java.util.List<?>) chargesObj).get(0);
            if (first instanceof Map) {
                Object chargeRef = ((Map<?, ?>) first).get("reference_id");
                if (chargeRef != null) {
                    return chargeRef.toString();
                }
            }
        }

        Object dataObj = payload.get("data");
        if (dataObj instanceof Map) {
            return extractReferenceId((Map<String, Object>) dataObj);
        }

        return null;
    }

    private String extractChargeId(Map<String, Object> payload) {
        Object chargeObj = payload.get("charge");
        if (chargeObj instanceof Map) {
            Object chargeId = ((Map<?, ?>) chargeObj).get("id");
            if (chargeId != null) {
                return chargeId.toString();
            }
        }

        Object chargesObj = payload.get("charges");
        if (chargesObj instanceof java.util.List && !((java.util.List<?>) chargesObj).isEmpty()) {
            Object first = ((java.util.List<?>) chargesObj).get(0);
            if (first instanceof Map) {
                Object chargeId = ((Map<?, ?>) first).get("id");
                if (chargeId != null) {
                    return chargeId.toString();
                }
            }
        }

        Object dataObj = payload.get("data");
        if (dataObj instanceof Map) {
            return extractChargeId((Map<String, Object>) dataObj);
        }

        return null;
    }

    private Long extractPaymentId(String referenceId) {
        try {
            if (referenceId == null) return null;
            // tenta achar um número no final
            String digits = referenceId.replaceAll("[^0-9]", "");
            if (digits.isEmpty()) return null;
            return Long.parseLong(digits);
        } catch (Exception e) {
            return null;
        }
    }
}
