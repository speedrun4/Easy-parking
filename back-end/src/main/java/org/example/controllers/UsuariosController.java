package org.example.controllers;

import org.example.models.Usuarios;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import org.example.models.Usuarios;
import org.example.services.UsuariosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("api/usuarios")
@CrossOrigin(origins = "http://localhost:4200") // Permitir requisições do Angular no localhost
public class UsuariosController {
    @Autowired
    private UsuariosService usuariosService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<Usuarios> usuarioOpt = usuariosService.findByEmail(loginRequest.getEmail());

        if (usuarioOpt.isPresent()) {
            Usuarios usuario = usuarioOpt.get();
            if (usuario.getSenha().equals(loginRequest.getPassword())) {
                // Exemplo de token, em produção use JWT ou outro mecanismo de token real
                String token = "fake-jwt-token";
                return ResponseEntity.ok(new AuthResponse(token, usuario.getNomeCompleto(), usuario.getPerfil()));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Senha incorreta");
            }
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuário não encontrado");
        }
    }

    @PostMapping
    public ResponseEntity<Usuarios> register(@RequestBody Usuarios usuario) {
        // Validação e verificação do perfil
        if (usuario.getPerfil() == null || (!usuario.getPerfil().equals("usuario") && !usuario.getPerfil().equals("cliente"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
        // Você pode adicionar validações aqui
        Usuarios savedUsuario = usuariosService.saveUsuario(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUsuario);
    }

}


