package org.example.controllers;

import org.example.services.AsaasClient;
import org.example.services.PagamentoService;
import org.example.repositories.PagamentoRepository;
import org.example.repositories.UsuariosRepository;
import org.example.models.Pagamentos;
import org.example.models.Usuarios;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping({"/api/asaas", "/api/pagbank"})
public class AsaasController {

    @Autowired
    private AsaasClient asaasClient;

    @Autowired
    private PagamentoService pagamentoService;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private UsuariosRepository usuariosRepository;

    /**
     * Cria uma compra no gateway configurado (Asaas para PIX).
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
    public ResponseEntity<?> createPurchase(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String method = String.valueOf(body.getOrDefault("method", "PIX")).toUpperCase();
            BigDecimal amount = new BigDecimal(String.valueOf(body.getOrDefault("amount", "1")));
            String description = String.valueOf(body.getOrDefault("description", "Compra"));
            String referenceId = String.valueOf(body.getOrDefault("referenceId", "ORDER-" + System.currentTimeMillis()));
            String productName = String.valueOf(body.getOrDefault("productName", description));
            Number usuarioId = (Number) body.get("usuarioId");
            Usuarios usuario = null;

            if (usuarioId != null) {
                usuario = usuariosRepository.findById(usuarioId.intValue()).orElse(null);
                if (usuario == null) {
                    return ResponseEntity.badRequest().body("Usuário não encontrado: " + usuarioId);
                }
            }

            Map<String, Object> result;
            if ("PIX".equals(method)) {
                if (asaasClient.hasConfiguredCredentials()) {
                    result = asaasClient.createPixPayment(referenceId, amount, description, usuario);
                } else {
                    return ResponseEntity.badRequest().body("Configure ASAAS_API_KEY para criar cobranças PIX rastreáveis.");
                }
            } else if ("CREDIT_CARD".equals(method) || "DEBIT_CARD".equals(method)) {
                if (!asaasClient.hasConfiguredCredentials()) {
                    return ResponseEntity.badRequest().body("Configure ASAAS_API_KEY para criar cobranças de cartão no Asaas.");
                }
                Object rawCard = body.get("card");
                if (!(rawCard instanceof Map)) {
                    return ResponseEntity.badRequest().body("Dados do cartão são obrigatórios para pagamentos com cartão.");
                }
                String remoteIp = resolveClientIp(request);
                result = asaasClient.createCardPayment(
                        method,
                        referenceId,
                        amount,
                        description,
                        usuario,
                        (Map<String, Object>) rawCard,
                        remoteIp
                );
            } else {
                return ResponseEntity.badRequest().body("Método de pagamento inválido: " + method);
            }

            // Persistência opcional: se vier usuarioId, criamos/atualizamos um Pagamentos local
            Pagamentos pagamentoLocal = null;
            if (usuarioId != null) {
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
                    p.setStatus(pagamentoService.isPaidGatewayStatus(apiStatus) ? "pago" : "aguardando_pagamento");
                }
                if ("PIX".equals(method)) {
                    p = pagamentoService.applyAsaasPixResponse(p, result);
                } else {
                    Object chargeId = result.get("id");
                    Object externalReference = result.containsKey("externalReference")
                            ? result.get("externalReference")
                            : result.get("external_reference");
                    p.setPagbankChargeId(chargeId != null ? chargeId.toString() : null);
                    p.setPagbankOrderId(externalReference != null ? externalReference.toString() : referenceId);
                    p.setPagbankStatus(apiStatus);
                    p.setPixGatewayProvider("ASAAS");
                    p = pagamentoRepository.save(p);
                }
                pagamentoLocal = p;
            }

            Map<String, Object> response = new HashMap<>();
            response.put("charge", result);
            if (pagamentoLocal != null) {
                response.put("paymentId", pagamentoLocal.getId());
                response.put("paymentStatus", pagamentoLocal.getStatus());
                response.put("provider", pagamentoLocal.getPixGatewayProvider());
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Falha ao criar compra: " + e.getMessage());
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.trim().isEmpty()) {
            String[] parts = forwarded.split(",");
            if (parts.length > 0 && !parts[0].trim().isEmpty()) {
                return parts[0].trim();
            }
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.trim().isEmpty()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
