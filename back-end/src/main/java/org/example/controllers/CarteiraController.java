package org.example.controllers;

import org.example.models.Carteira;
import org.example.models.Usuarios;
import org.example.repositories.UsuariosRepository;
import org.example.services.CarteiraService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/carteira")
public class CarteiraController {

    @Autowired
    private CarteiraService carteiraService;

    @Autowired
    private UsuariosRepository usuariosRepository;

    public static class CarteiraOperacaoRequest {
        private double valor;
        private String descricao;
        private String metodo;

        public double getValor() { return valor; }
        public void setValor(double valor) { this.valor = valor; }
        public String getDescricao() { return descricao; }
        public void setDescricao(String descricao) { this.descricao = descricao; }
        public String getMetodo() { return metodo; }
        public void setMetodo(String metodo) { this.metodo = metodo; }
    }

    // Retorna saldo atual + histórico de transações do usuário
    @GetMapping("/{usuarioId}")
    public ResponseEntity<?> obterCarteira(@PathVariable Integer usuarioId) {
        List<Carteira> historico = carteiraService.obterHistorico(usuarioId);
        double saldo = carteiraService.obterSaldoAtual(usuarioId);

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("saldo", saldo);
        resposta.put("historicoTransacoes", historico);
        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/{usuarioId}/adicionar")
    public ResponseEntity<?> adicionarValor(@PathVariable Integer usuarioId, @RequestBody CarteiraOperacaoRequest request) {
        Usuarios usuario = usuariosRepository.findById(usuarioId).orElse(null);
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Usuário não encontrado."));
        }

        String metodoFormatado = request.getMetodo() != null ? request.getMetodo().toUpperCase() : "N/A";
        String descricaoComMetodo = String.format("%s (%s)", request.getDescricao(), metodoFormatado);

        try {
            carteiraService.adicionarValor(usuario, request.getValor(), descricaoComMetodo, request.getMetodo());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        return obterCarteira(usuarioId);
    }

    @PostMapping("/{usuarioId}/remover")
    public ResponseEntity<?> removerValor(@PathVariable Integer usuarioId, @RequestBody CarteiraOperacaoRequest request) {
        Usuarios usuario = usuariosRepository.findById(usuarioId).orElse(null);
        if (usuario == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Usuário não encontrado."));
        }

        double saldoAtual = carteiraService.obterSaldoAtual(usuarioId);
        if (saldoAtual < request.getValor()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Saldo insuficiente."));
        }

        try {
            carteiraService.removerValor(usuario, request.getValor(), request.getDescricao());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        return obterCarteira(usuarioId);
    }
}
