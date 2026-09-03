package org.example.controllers;

import org.example.models.Pagamentos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;


import org.example.models.Pagamentos;
import org.example.services.PagamentoService;
import org.example.models.Cliente;
import org.example.models.Usuarios;
import org.example.repositories.ClienteRepository;
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
        if (nomeEstacionamento == null || nomeEstacionamento.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return pagamentosRepository.findByEstacionamentoNormalized(nomeEstacionamento);
    }

    @GetMapping("/estacionamento/usuario/{usuarioId}")
    public List<Pagamentos> getPagamentosDosEstacionamentosDoUsuario(@PathVariable Integer usuarioId) {
        if (usuarioId == null) {
            return java.util.Collections.emptyList();
        }

        List<Cliente> clientes = clienteRepository.findByUsuarioId(usuarioId);
        if (clientes == null || clientes.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        java.util.List<String> nomesNormalizados = clientes.stream()
                .map(Cliente::getNomeEmpresa)
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toLowerCase)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        if (nomesNormalizados.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        return pagamentosRepository.findByEstacionamentoNormalizedIn(nomesNormalizados);
    }
    
    @Autowired
    private PagamentoService service;
    @Autowired
    private PagamentoRepository pagamentosRepository;
    @Autowired
    private ClienteRepository clienteRepository;
    @Autowired
    private UsuariosRepository usuariosRepository;
    @Autowired
    private org.example.services.PagamentoService pagamentoService;
    @Autowired
    private org.example.services.AsaasClient asaasClient;

    @org.springframework.beans.factory.annotation.Value("${pagbank.sandbox:true}")
    private boolean pagbankSandbox;
    @org.springframework.beans.factory.annotation.Value("${pix.key:}")
    private String pixDefaultKey;

    public static class PixStartRequest {
        private String pixKey;

        public String getPixKey() {
            return pixKey;
        }

        public void setPixKey(String pixKey) {
            this.pixKey = pixKey;
        }
    }

    private String resolvePixKey(String requestedPixKey) {
        if (requestedPixKey != null && !requestedPixKey.trim().isEmpty()) {
            return requestedPixKey.trim();
        }
        if (pixDefaultKey != null && !pixDefaultKey.trim().isEmpty()) {
            return pixDefaultKey.trim();
        }
        return null;
    }

    private String resolvePixProvider(Pagamentos pagamento) {
        if (pagamento == null || pagamento.getPixGatewayProvider() == null || pagamento.getPixGatewayProvider().trim().isEmpty()) {
            return pagamento != null && pagamento.getPagbankChargeId() != null && !pagamento.getPagbankChargeId().trim().isEmpty()
                    ? "ASAAS"
                    : "STATIC";
        }
        return pagamento.getPixGatewayProvider().trim().toUpperCase();
    }

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

    // Inicia/força criação de cobrança PIX para um pagamento existente
    @PostMapping({"/{id}/asaas/pix", "/{id}/pagbank/pix"})
    public ResponseEntity<?> criarPixAsaas(@PathVariable Long id, @RequestBody(required = false) PixStartRequest request) {
        return pagamentosRepository.findById(id).map(p -> {
            try {
                String resolvedPixKey = resolvePixKey(request != null ? request.getPixKey() : null);
                if (p.getFormaPagamento() == null || !p.getFormaPagamento().equalsIgnoreCase("PIX")) {
                    p.setFormaPagamento("PIX");
                }
                p.setStatus("aguardando_pagamento");
                pagamentosRepository.save(p);
                Pagamentos atualizado = service.ensurePixCharge(p, resolvedPixKey);
                atualizado = pagamentosRepository.findById(id).orElse(atualizado);
                boolean requiresTrackableCharge = service.hasTrackablePixGateway();
                if (requiresTrackableCharge && (atualizado.getPagbankChargeId() == null || atualizado.getPagbankChargeId().trim().isEmpty())) {
                    java.util.Map<String, Object> err = new java.util.HashMap<>();
                    err.put("message", "Não foi possível criar cobrança PIX rastreável no gateway configurado. Verifique as credenciais do Asaas.");
                    err.put("status", "UNTRACKABLE");
                    return ResponseEntity.status(502).body(err);
                }

                atualizado = service.ensurePixDisplayData(atualizado, resolvedPixKey);
                atualizado = pagamentosRepository.findById(id).orElse(atualizado);
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("asaasChargeId", atualizado.getPagbankChargeId());
                result.put("pagbankChargeId", atualizado.getPagbankChargeId());
                result.put("status", atualizado.getPagbankStatus());
                result.put("qrBase64", atualizado.getPagbankQrBase64());
                result.put("qrPayload", atualizado.getPagbankQrPayload());
                result.put("pixKey", resolvedPixKey);
                result.put("provider", resolvePixProvider(atualizado));
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(500).body("Falha ao criar cobrança PIX: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // Consulta status da cobrança e atualiza o pagamento local
    @GetMapping({"/{id}/asaas/status", "/{id}/pagbank/status"})
    public ResponseEntity<?> consultarStatusAsaas(@PathVariable Long id) {
        return pagamentosRepository.findById(id).map(p -> {
            String provider = resolvePixProvider(p);
            if (p.getPagbankChargeId() == null) {
                java.util.Map<String, Object> respBody = new java.util.HashMap<String, Object>();
                respBody.put("status", "UNTRACKABLE");
                respBody.put("paymentStatus", p.getStatus());
                respBody.put("message", "Pagamento PIX sem cobrança rastreável no Asaas. Gere um novo PIX após validar ASAAS_API_KEY.");
                respBody.put("provider", provider);
                return ResponseEntity.ok(respBody);
            }
            try {
                if ("ASAAS".equals(provider)) {
                    java.util.Map<String, Object> map = asaasClient.getPayment(p.getPagbankChargeId());
                    p = service.applyAsaasPixResponse(p, map);
                } else {
                    java.util.Map<String, Object> respBody = new java.util.HashMap<String, Object>();
                    respBody.put("status", p.getPagbankStatus() != null ? p.getPagbankStatus() : "WAITING");
                    respBody.put("paymentStatus", p.getStatus());
                    respBody.put("qrBase64", p.getPagbankQrBase64());
                    respBody.put("qrPayload", p.getPagbankQrPayload());
                    respBody.put("pixKey", resolvePixKey(null));
                    respBody.put("provider", resolvePixProvider(p));
                    respBody.put("message", "Cobrança sem provedor rastreável externo.");
                    return ResponseEntity.ok(respBody);
                }

                p = service.ensurePixDisplayData(p, null);
                java.util.Map<String, Object> respBody = new java.util.HashMap<String, Object>();
                respBody.put("status", p.getPagbankStatus());
                respBody.put("paymentStatus", p.getStatus());
                respBody.put("qrBase64", p.getPagbankQrBase64());
                respBody.put("qrPayload", p.getPagbankQrPayload());
                respBody.put("pixKey", resolvePixKey(null));
                respBody.put("provider", resolvePixProvider(p));
                return ResponseEntity.ok(respBody);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(500).body("Falha ao consultar status: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- SANDBOX: simula confirmação do PIX como PAID (não existe em produção)
    @PostMapping({"/{id}/asaas/simular-pago", "/{id}/pagbank/simular-pago"})
    public ResponseEntity<?> simularPixPago(@PathVariable Long id) {
        return pagamentosRepository.findById(id).map(p -> {
            if (!pagbankSandbox) {
                return ResponseEntity.status(403).body("Simulação permitida apenas em sandbox");
            }
            String provider = resolvePixProvider(p);
            if ("ASAAS".equals(provider) && p.getPagbankChargeId() != null && !p.getPagbankChargeId().trim().isEmpty()) {
                try {
                    // Confirma oficialmente a cobrança no Sandbox da Asaas, para que o
                    // status também fique correto do lado do gateway (não só local).
                    java.util.Map<String, Object> confirmed = asaasClient.confirmSandboxPayment(p.getPagbankChargeId());
                    p = service.applyAsaasPixResponse(p, confirmed);
                } catch (Exception e) {
                    e.printStackTrace();
                    return ResponseEntity.status(502).body("Falha ao confirmar pagamento no Asaas Sandbox: " + e.getMessage());
                }
            } else {
                // Sem cobrança rastreável no gateway: marca como pago apenas localmente para testes
                p.setPagbankStatus("PAID");
                p.setStatus("pago");
                pagamentosRepository.save(p);
            }
            java.util.Map<String, Object> resp = new java.util.HashMap<String, Object>();
            resp.put("status", p.getPagbankStatus());
            resp.put("paymentStatus", p.getStatus());
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
            atualizado = pagamentoService.reconcileEntryQrState(atualizado);

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
            result.put("parkingName", atualizado.getEstacionamento());
            result.put("parkingAddress", atualizado.getEndereco());
            result.put("reservationDate", atualizado.getDataReservaEntrada());
            result.put("reservationStartTime", atualizado.getHorarioReservaEntrada());

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
                // Regra: deve estar pago
                if (p.getStatus() == null || !p.getStatus().equalsIgnoreCase("pago")) {
                    return ResponseEntity.status(409).body("Pagamento não está pago");
                }

                // Construir janela de reserva caso exista
                java.time.LocalDate dataEntrada = p.getDataReservaEntrada();
                java.time.LocalTime horaInicio = p.getHorarioReservaEntrada();
                java.time.LocalTime horaFim = p.getHorarioReservaSaida();
                java.time.LocalDateTime agora = java.time.LocalDateTime.now();
                java.time.LocalDateTime inicioReserva = (dataEntrada != null && horaInicio != null)
                        ? java.time.LocalDateTime.of(dataEntrada, horaInicio)
                        : null;
                java.time.LocalDateTime fimReserva = (dataEntrada != null && horaFim != null)
                        ? java.time.LocalDateTime.of(dataEntrada, horaFim)
                        : null;

                if ("entry".equalsIgnoreCase(type)) {
                    // Legível: já pressuposto pelo decode; Status precisa estar ativo
                    if (!"ativo".equalsIgnoreCase(p.getEntryQrStatus())) {
                        return ResponseEntity.status(409).body("QR de entrada inválido ou já consumido/expirado");
                    }
                    // Dentro da data e horário agendado
                    if (inicioReserva == null || fimReserva == null) {
                        return ResponseEntity.status(409).body("Reserva sem data/horário configurado");
                    }
                    // Tolerância: permitir validação até 10 minutos ANTES do horário de início
                    java.time.LocalDateTime inicioComTolerancia = inicioReserva.minusMinutes(10);
                    if (agora.isBefore(inicioComTolerancia)) {
                        return ResponseEntity.status(409).body("A reserva ainda não começou (tolerância 10min)");
                    }
                    java.time.LocalDateTime fimJanelaEntrada = inicioReserva.plusMinutes(5);
                    if (agora.isAfter(fimJanelaEntrada)) {
                        p.setEntryQrStatus("expirado");
                        p.setEntryQrToken(null);
                        p.setEntryQrImageBase64(null);
                        pagamentosRepository.save(p);
                        return ResponseEntity.status(409).body("O prazo para validar o QR de entrada expirou");
                    }
                    // Consumo
                    p.setEntryQrStatus("consumido");
                    p.setEntryQrConsumedAt(agora);
                    p.setEntryQrToken(null);
                    p.setEntryQrImageBase64(null);
                    pagamentosRepository.save(p);
                    return ResponseEntity.ok(java.util.Collections.singletonMap("status", "ENTRY_CONSUMED"));
                } else if ("exit".equalsIgnoreCase(type)) {
                    if (!"ativo".equalsIgnoreCase(p.getExitQrStatus())) {
                        return ResponseEntity.status(409).body("QR de saída inválido ou já consumido/expirado");
                    }
                    // Tolerância de saída: permitir validação até 10 minutos ANTES do horário de fim
                    if (fimReserva != null) {
                        java.time.LocalDateTime fimComTolerancia = fimReserva.minusMinutes(10);
                        if (agora.isBefore(fimComTolerancia)) {
                            return ResponseEntity.status(409).body("A saída só é permitida próximo ao fim da reserva (tolerância 10min)");
                        }
                    }
                    p.setExitQrStatus("consumido");
                    p.setExitQrConsumedAt(agora);
                    pagamentosRepository.save(p);
                    return ResponseEntity.ok(java.util.Collections.singletonMap("status", "EXIT_CONSUMED"));
                }
                return ResponseEntity.status(409).body("Tipo de QR inválido");
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
    atualizado = pagamentoService.reconcileEntryQrState(atualizado);

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
    result.put("parkingName", atualizado.getEstacionamento());
    result.put("parkingAddress", atualizado.getEndereco());
    result.put("reservationDate", atualizado.getDataReservaEntrada());
    result.put("reservationStartTime", atualizado.getHorarioReservaEntrada());

    return ResponseEntity.ok(result);
    }

}
