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
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", allowCredentials = "true")
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
            // Exemplo: muitos webhooks trazem "reference_id" e "status"
            Object ref = payload.get("reference_id");
            Object status = payload.get("status");
            if (ref != null) {
                String referenceId = ref.toString();
                // referencia esperada: "PAY-<id>" ou "ORDER-<id>"
                Long pagamentoId = extractPaymentId(referenceId);
                if (pagamentoId != null) {
                    Pagamentos p = pagamentoRepository.findById(pagamentoId).orElse(null);
                    if (p != null) {
                        if (status != null) {
                            String st = status.toString();
                            p.setPagbankStatus(st);
                            if ("PAID".equalsIgnoreCase(st)) {
                                p.setStatus("pago");
                            }
                            pagamentoRepository.save(p);
                        }
                    }
                }
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Falha ao processar notificação: " + e.getMessage());
        }
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
