package org.example.controllers;

import org.example.models.MensagemUsuario;
import org.example.models.Usuarios;
import org.example.repositories.MensagemUsuarioRepository;
import org.example.repositories.UsuariosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mensagens")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", allowCredentials = "true")
public class MensagemController {

    @Autowired
    private MensagemUsuarioRepository mensagemUsuarioRepository;

    @Autowired
    private UsuariosRepository usuariosRepository;

    @PostMapping
    public ResponseEntity<?> enviarMensagem(@RequestBody Map<String, Object> body) {
        try {
            if (body == null) {
                return ResponseEntity.badRequest().body("Payload obrigatório");
            }

            Object remetenteIdObj = body.get("remetenteId");
            Object destinatarioIdObj = body.get("destinatarioId");
            Object conteudoObj = body.get("conteudo");

            if (remetenteIdObj == null || destinatarioIdObj == null || conteudoObj == null) {
                return ResponseEntity.badRequest().body("Campos remetenteId, destinatarioId e conteudo são obrigatórios");
            }

            Integer remetenteId = Integer.parseInt(remetenteIdObj.toString());
            Integer destinatarioId = Integer.parseInt(destinatarioIdObj.toString());
            String conteudo = conteudoObj.toString().trim();

            if (conteudo.isEmpty()) {
                return ResponseEntity.badRequest().body("Conteúdo da mensagem não pode ser vazio");
            }

            Usuarios remetente = usuariosRepository.findById(remetenteId).orElse(null);
            Usuarios destinatario = usuariosRepository.findById(destinatarioId).orElse(null);

            if (remetente == null || destinatario == null) {
                return ResponseEntity.badRequest().body("Remetente ou destinatário inválido");
            }

            MensagemUsuario mensagem = new MensagemUsuario();
            mensagem.setRemetente(remetente);
            mensagem.setDestinatario(destinatario);
            mensagem.setConteudo(conteudo);
            mensagem.setLida(false);

            MensagemUsuario salva = mensagemUsuarioRepository.save(mensagem);
            return ResponseEntity.ok(salva);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Falha ao enviar mensagem: " + e.getMessage());
        }
    }

    @GetMapping("/destinatario/{destinatarioId}")
    public ResponseEntity<List<MensagemUsuario>> listarMensagensDoDestinatario(
            @PathVariable Integer destinatarioId,
            @RequestParam(name = "apenasNaoLidas", defaultValue = "false") boolean apenasNaoLidas
    ) {
        List<MensagemUsuario> mensagens = apenasNaoLidas
                ? mensagemUsuarioRepository.findByDestinatarioIdAndLidaFalseOrderByCriadaEmDesc(destinatarioId)
                : mensagemUsuarioRepository.findByDestinatarioIdOrderByCriadaEmDesc(destinatarioId);
        return ResponseEntity.ok(mensagens);
    }

    @PutMapping("/{id}/marcar-lida")
    public ResponseEntity<?> marcarComoLida(@PathVariable Long id) {
        return mensagemUsuarioRepository.findById(id).map(mensagem -> {
            mensagem.setLida(true);
            mensagemUsuarioRepository.save(mensagem);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluirMensagem(
            @PathVariable Long id,
            @RequestParam(name = "destinatarioId") Integer destinatarioId
    ) {
        return mensagemUsuarioRepository.findById(id).map(mensagem -> {
            if (mensagem.getDestinatario() == null || !destinatarioId.equals(mensagem.getDestinatario().getId())) {
                return ResponseEntity.status(403).body("Mensagem não pertence ao destinatário informado");
            }
            mensagemUsuarioRepository.delete(mensagem);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
