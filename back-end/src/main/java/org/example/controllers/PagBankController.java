package org.example.controllers;

import org.example.services.PagBankClient;
import org.example.repositories.PagamentoRepository;
import org.example.repositories.UsuariosRepository;
import org.example.models.Pagamentos;
import org.example.models.Usuarios;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/pagbank")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", allowCredentials = "true")
public class PagBankController {

    @Autowired
    private PagBankClient pagBankClient;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private UsuariosRepository usuariosRepository;

    /**
     * Cria uma compra e cobra no PagBank.
     * Body mínimo:
     * {
     *   "method": "PIX" | "CREDIT_CARD" | "DEBIT_CARD",
     *   "amount": 100.50,
     *   "description": "Produto/serviço",
     *   "referenceId": "ORDER-123",
     *   "card": { // quando for cartão
     *       "number": "4111111111111111",
     *       "exp_month": "12",
     *       "exp_year": "2030",
     *       "security_code": "123",
     *       "holder": {"name": "Fulano", "tax_id": "00000000000"}
     *   }
     * }
     */
    @PostMapping("/purchase")
    public ResponseEntity<?> createPurchase(@RequestBody Map<String, Object> body) {
        try {
            String method = String.valueOf(body.getOrDefault("method", "PIX")).toUpperCase();
            BigDecimal amount = new BigDecimal(String.valueOf(body.getOrDefault("amount", "1")));
            String description = String.valueOf(body.getOrDefault("description", "Compra"));
            String referenceId = String.valueOf(body.getOrDefault("referenceId", "ORDER-" + System.currentTimeMillis()));
            String productName = String.valueOf(body.getOrDefault("productName", description));
            Number usuarioId = (Number) body.get("usuarioId");
            int cents = amount.multiply(new BigDecimal(100)).intValue();

            Map<String, Object> result;
            if ("PIX".equals(method)) {
                result = pagBankClient.createPixCharge(referenceId, cents, description);
            } else if ("CREDIT_CARD".equals(method) || "DEBIT_CARD".equals(method)) {
                Map<String, Object> card = (Map<String, Object>) body.get("card");
                if (card == null) {
                    return ResponseEntity.badRequest().body("Dados do cartão são obrigatórios para pagamentos com cartão");
                }
                result = pagBankClient.createCardCharge(referenceId, cents, description, method, card);
            } else {
                return ResponseEntity.badRequest().body("Método de pagamento inválido: " + method);
            }

            // Persistência opcional: se vier usuarioId, criamos/atualizamos um Pagamentos local
            Pagamentos pagamentoLocal = null;
            if (usuarioId != null) {
                Usuarios usuario = usuariosRepository.findById(usuarioId.intValue()).orElse(null);
                if (usuario == null) {
                    return ResponseEntity.badRequest().body("Usuário não encontrado: " + usuarioId);
                }
                Pagamentos p = new Pagamentos();
                p.setUsuario(usuario);
                p.setFormaPagamento(method);
                p.setValorPago(amount);
                p.setNome(productName);
                p.setData(java.time.LocalDate.now());
                p.setHorario(java.time.LocalTime.now());
                // status inicial conforme método/retorno
                String apiStatus = String.valueOf(result.getOrDefault("status", "WAITING"));
                if ("PIX".equals(method)) {
                    p.setStatus("aguardando_pagamento");
                } else {
                    // Para cartão, se status vier PAID marcamos como pago, senão aguardando
                    p.setStatus("PAID".equalsIgnoreCase(apiStatus) ? "pago" : "aguardando_pagamento");
                }
                Object chargeId = result.get("id");
                p.setPagbankChargeId(chargeId != null ? chargeId.toString() : null);
                p.setPagbankStatus(apiStatus);
                // QR PIX
                Object qr = result.get("qr_code");
                if (qr instanceof Map) {
                    Object qrBase64 = ((Map<?,?>) qr).get("base64");
                    Object qrText = ((Map<?,?>) qr).get("text");
                    if (qrBase64 != null) p.setPagbankQrBase64(qrBase64.toString());
                    if (qrText != null) p.setPagbankQrPayload(qrText.toString());
                }
                pagamentoLocal = pagamentoRepository.save(p);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("charge", result);
            if (pagamentoLocal != null) {
                response.put("paymentId", pagamentoLocal.getId());
                response.put("paymentStatus", pagamentoLocal.getStatus());
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Falha ao criar compra: " + e.getMessage());
        }
    }
}
