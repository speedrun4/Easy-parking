package org.example.controllers;

import org.example.models.Pagamentos;
import org.example.services.PagamentoService;
import org.example.models.Usuarios;
import org.example.repositories.UsuariosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/pagamentos")
public class PagamentoController {

    @Autowired
    private PagamentoService service;

    @Autowired
    private UsuariosRepository usuariosRepository;

    @PostMapping
    public ResponseEntity<Pagamentos> criarPagamento(@RequestBody Pagamentos pagamento) {
        pagamento.setData(LocalDate.now());
        pagamento.setHorario(LocalTime.now());

        // Vínculo com usuário
        if (pagamento.getUsuario() == null && pagamento.getUsuario() == null) {
            return ResponseEntity.badRequest().build();
        }
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
    public List<Pagamentos> listarTodos(@RequestParam(value = "usuarioId", required = false) Integer usuarioId) {
        if (usuarioId != null) {
            return service.listarPorUsuario(usuarioId);
        }
        return service.listarTodos();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarPagamento(@PathVariable Long id) {
        service.deletarPorId(id);
        return ResponseEntity.noContent().build();
    }
}
