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

    @PostMapping
    public ResponseEntity<Pagamentos> criarPagamento(@RequestBody Pagamentos pagamento) {
        // Se não vier do front, define data e horário atuais
        if (pagamento.getData() == null) {
            pagamento.setData(LocalDate.now());
        }
        if (pagamento.getHorario() == null) {
            pagamento.setHorario(LocalTime.now());
        }
        pagamento.setStatus("pago");

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
