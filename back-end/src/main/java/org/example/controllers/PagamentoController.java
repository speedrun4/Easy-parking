package org.example.controllers;

import org.example.models.Pagamentos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;


import org.example.models.Pagamentos;
import org.example.services.PagamentoService;
import org.example.models.Usuarios;
import org.example.repositories.UsuariosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.example.repositories.PagamentoRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/pagamentos")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", allowCredentials = "true")
public class PagamentoController {

    // Endpoint para buscar reservas do cliente (pagamentos com status 'pago')
    @GetMapping("/cliente/{clienteId}")
    public List<Pagamentos> getPagamentosPorCliente(@PathVariable Integer clienteId) {
        List<Pagamentos> pagamentos = pagamentosRepository.findByUsuarioId(clienteId);
        // Filtra apenas os pagos
    return pagamentos.stream()
        .filter(p -> p.getStatus() != null && p.getStatus().equalsIgnoreCase("pago"))
        .collect(java.util.stream.Collectors.toList());
    }

    @GetMapping("/estacionamento/{nomeEstacionamento}")
    public List<Pagamentos> getPagamentosPorEstacionamento(@PathVariable String nomeEstacionamento) {
        return pagamentosRepository.findByEstacionamento(nomeEstacionamento);
    }
    
    @Autowired
    private PagamentoService service;
    @Autowired
    private PagamentoRepository pagamentosRepository;
    @Autowired
    private UsuariosRepository usuariosRepository;
    @Autowired
    private org.example.services.PagamentoService pagamentoService;

    @org.springframework.beans.factory.annotation.Value("${pagbank.sandbox:true}")
    private boolean pagbankSandbox;
    @org.springframework.beans.factory.annotation.Value("${pagbank.token}")
    private String pagbankToken;

    @PostMapping
    public ResponseEntity<Pagamentos> criarPagamento(@RequestBody Pagamentos pagamento) {
        // Se não vier do front, define data e horário atuais
        if (pagamento.getData() == null) {
            pagamento.setData(LocalDate.now());
        }
        if (pagamento.getHorario() == null) {
            pagamento.setHorario(LocalTime.now());
        }
        // Se forma de pagamento for PIX via PagBank, inicia como aguardando pagamento
        if (pagamento.getFormaPagamento() != null && pagamento.getFormaPagamento().equalsIgnoreCase("PIX")) {
            pagamento.setStatus("aguardando_pagamento");
        } else {
            pagamento.setStatus("pago");
        }

        // Vínculo com usuário
       
        Usuarios usuario = null;
        if (pagamento.getUsuario() != null && pagamento.getUsuario().getId() != null) {
            usuario = usuariosRepository.findById(pagamento.getUsuario().getId()).orElse(null);
        }
        if (usuario == null) {
            return ResponseEntity.badRequest().build();
        }
        pagamento.setUsuario(usuario);

        Pagamentos salvo = service.salvarPagamento(pagamento);
        return ResponseEntity.ok(salvo);
    }

    // Inicia/força criação de cobrança PIX do PagBank para um pagamento existente
    @PostMapping("/{id}/pagbank/pix")
    public ResponseEntity<?> criarPixPagBank(@PathVariable Long id) {
        return pagamentosRepository.findById(id).map(p -> {
            try {
                if (p.getFormaPagamento() == null || !p.getFormaPagamento().equalsIgnoreCase("PIX")) {
                    p.setFormaPagamento("PIX");
                }
                p.setStatus("aguardando_pagamento");
                pagamentosRepository.save(p);
                service.salvarPagamento(p); // irá acionar criação de cobrança se necessário
                Pagamentos atualizado = pagamentosRepository.findById(id).orElse(p);
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("pagbankChargeId", atualizado.getPagbankChargeId());
                result.put("status", atualizado.getPagbankStatus());
                result.put("qrBase64", atualizado.getPagbankQrBase64());
                result.put("qrPayload", atualizado.getPagbankQrPayload());
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(500).body("Falha ao criar cobrança PIX: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // Consulta status da cobrança no PagBank e atualiza o pagamento local
    @GetMapping("/{id}/pagbank/status")
    public ResponseEntity<?> consultarStatusPagBank(@PathVariable Long id) {
        return pagamentosRepository.findById(id).map(p -> {
            if (p.getPagbankChargeId() == null) {
                return ResponseEntity.badRequest().body("Pagamento sem chargeId do PagBank");
            }
            try {
                String baseUrl = pagbankSandbox ?
                        "https://sandbox.api.pagseguro.com" : "https://api.pagseguro.com";
                String url = baseUrl + "/charges/" + p.getPagbankChargeId();
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.setBearerAuth(pagbankToken);
                org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
                org.springframework.web.client.RestTemplate rt = new org.springframework.web.client.RestTemplate();
                org.springframework.http.ResponseEntity<String> resp = rt.exchange(url, org.springframework.http.HttpMethod.GET, entity, String.class);
                if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    java.util.Map<?,?> map = mapper.readValue(resp.getBody(), java.util.Map.class);
                    Object st = map.get("status");
                    if (st != null) {
                        p.setPagbankStatus(st.toString());
                        if ("PAID".equalsIgnoreCase(st.toString())) {
                            p.setStatus("pago");
                        }
                        pagamentosRepository.save(p);
                    }
                    java.util.Map<String, Object> respBody = new java.util.HashMap<String, Object>();
                    respBody.put("status", p.getPagbankStatus());
                    return ResponseEntity.ok(respBody);
                }
                return ResponseEntity.status(resp.getStatusCode()).body("Falha ao consultar status");
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(500).body("Falha ao consultar status: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- SANDBOX: simula confirmação do PIX como PAID (não existe em produção)
    @PostMapping("/{id}/pagbank/simular-pago")
    public ResponseEntity<?> simularPixPago(@PathVariable Long id) {
        return pagamentosRepository.findById(id).map(p -> {
            if (!pagbankSandbox) {
                return ResponseEntity.status(403).body("Simulação permitida apenas em sandbox");
            }
            // Marca como pago localmente para testes
            p.setPagbankStatus("PAID");
            p.setStatus("pago");
            pagamentosRepository.save(p);
            java.util.Map<String, Object> resp = new java.util.HashMap<String, Object>();
            resp.put("status", p.getPagbankStatus());
            return ResponseEntity.ok(resp);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<Pagamentos> getPagamentos(@RequestParam(required = false) Long usuarioId) {
        if (usuarioId != null) {
            return pagamentosRepository.findByUsuarioId(Math.toIntExact(usuarioId));
        } else {
            return pagamentosRepository.findAll();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarPagamento(@PathVariable Long id) {
        service.deletarPorId(id);
        return ResponseEntity.noContent().build();
    }

    // --- QR Codes ---
    @GetMapping("/{id}/qrcodes")
    public ResponseEntity<?> getQRCodes(@PathVariable Long id) {
        return pagamentosRepository.findById(id)
        .<ResponseEntity<?>>map(p -> {
            // Garante geração do QR de entrada se não existir e QR de saída se já for devido
            pagamentoService.ensureEntryQr(p);
            pagamentoService.ensureExitQrIfDue(p);
            // Recarrega estado atual
            Pagamentos atualizado = pagamentosRepository.findById(id).orElse(p);

            java.util.Map<String, Object> entry = new java.util.HashMap<String, Object>();
            entry.put("token", atualizado.getEntryQrToken());
            entry.put("imageBase64", atualizado.getEntryQrImageBase64());
            entry.put("status", atualizado.getEntryQrStatus());

            java.util.Map<String, Object> exit = new java.util.HashMap<String, Object>();
            exit.put("token", atualizado.getExitQrToken());
            exit.put("imageBase64", atualizado.getExitQrImageBase64());
            exit.put("status", atualizado.getExitQrStatus());

            java.util.Map<String, Object> result = new java.util.HashMap<String, Object>();
            result.put("entry", entry);
            result.put("exit", exit);

            return ResponseEntity.ok(result);
        })
        .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/qrcodes/consume")
    public ResponseEntity<?> consumeQRCode(@PathVariable Long id, @RequestParam String type) {
        return pagamentosRepository.findById(id).map(p -> {
            if ("entry".equalsIgnoreCase(type) && "ativo".equalsIgnoreCase(p.getEntryQrStatus())) {
                p.setEntryQrStatus("consumido");
                p.setEntryQrConsumedAt(java.time.LocalDateTime.now());
                pagamentosRepository.save(p);
                return ResponseEntity.ok().build();
            } else if ("exit".equalsIgnoreCase(type) && "ativo".equalsIgnoreCase(p.getExitQrStatus())) {
                p.setExitQrStatus("consumido");
                p.setExitQrConsumedAt(java.time.LocalDateTime.now());
                pagamentosRepository.save(p);
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.status(409).body("QR Code inválido ou já consumido/expirado");
        }).orElse(ResponseEntity.notFound().build());
    }

    // Consome QR Code a partir do token escaneado (Base64 URL), usado pela câmera do cliente/portaria
    @PostMapping("/qrcodes/consume-by-token")
    public ResponseEntity<?> consumeByToken(@RequestParam("token") String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body("Token obrigatório");
        }
        try {
            String decoded = new String(java.util.Base64.getUrlDecoder().decode(token), java.nio.charset.StandardCharsets.UTF_8);
            java.util.Map<String, String> map = parsePayload(decoded);
            String type = map.get("type");
            String paymentIdStr = map.get("paymentId");
            if (type == null || paymentIdStr == null) {
                return ResponseEntity.badRequest().body("Token inválido");
            }
            Long paymentId = Long.parseLong(paymentIdStr);

            return pagamentosRepository.findById(paymentId).map(p -> {
                if ("entry".equalsIgnoreCase(type) && "ativo".equalsIgnoreCase(p.getEntryQrStatus())) {
                    p.setEntryQrStatus("consumido");
                    p.setEntryQrConsumedAt(java.time.LocalDateTime.now());
                    pagamentosRepository.save(p);
                    return ResponseEntity.ok(java.util.Collections.singletonMap("status", "ENTRY_CONSUMED"));
                } else if ("exit".equalsIgnoreCase(type) && "ativo".equalsIgnoreCase(p.getExitQrStatus())) {
                    p.setExitQrStatus("consumido");
                    p.setExitQrConsumedAt(java.time.LocalDateTime.now());
                    pagamentosRepository.save(p);
                    return ResponseEntity.ok(java.util.Collections.singletonMap("status", "EXIT_CONSUMED"));
                }
                return ResponseEntity.status(409).body("QR Code inválido ou já consumido/expirado");
            }).orElse(ResponseEntity.status(404).body("Pagamento não encontrado"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body("Token inválido");
        }
    }

    private java.util.Map<String, String> parsePayload(String payload) {
        java.util.Map<String, String> result = new java.util.HashMap<String, String>();
        if (payload == null) return result;
        String[] parts = payload.split(";");
        for (String part : parts) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) {
                result.put(kv[0], kv[1]);
            }
        }
        return result;
    }

    // Retorna os QRs (entrada/saída) do último pagamento 'pago' do usuário
    @GetMapping("/ultimo-qrcodes")
    public ResponseEntity<?> getUltimoQRCodes(@RequestParam("usuarioId") Long usuarioId) {
        java.util.List<Pagamentos> lista = pagamentosRepository.findByUsuarioId(Math.toIntExact(usuarioId));
        if (lista == null || lista.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // pega o último com status 'pago'
        Pagamentos ultimoPago = lista.stream()
                .filter(p -> p.getStatus() != null && p.getStatus().equalsIgnoreCase("pago"))
                .sorted((a, b) -> Long.compare(
                        a.getId() != null ? a.getId() : -1,
                        b.getId() != null ? b.getId() : -1
                ))
                .reduce((first, second) -> second)
                .orElse(null);

        if (ultimoPago == null) {
            return ResponseEntity.notFound().build();
        }

        // garante geração caso esteja faltando
        pagamentoService.ensureEntryQr(ultimoPago);
        pagamentoService.ensureExitQrIfDue(ultimoPago);

    Pagamentos atualizado = pagamentosRepository.findById(ultimoPago.getId()).orElse(ultimoPago);

    java.util.Map<String, Object> entry = new java.util.HashMap<String, Object>();
    entry.put("token", atualizado.getEntryQrToken());
    entry.put("imageBase64", atualizado.getEntryQrImageBase64());
    entry.put("status", atualizado.getEntryQrStatus());

    java.util.Map<String, Object> exit = new java.util.HashMap<String, Object>();
    exit.put("token", atualizado.getExitQrToken());
    exit.put("imageBase64", atualizado.getExitQrImageBase64());
    exit.put("status", atualizado.getExitQrStatus());

    java.util.Map<String, Object> result = new java.util.HashMap<String, Object>();
    result.put("paymentId", atualizado.getId());
    result.put("entry", entry);
    result.put("exit", exit);

    return ResponseEntity.ok(result);
    }

}
