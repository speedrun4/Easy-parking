package org.example.controllers;

import org.example.dto.AuthResponse;
import org.example.dto.ResetPasswordRequest;
import org.example.models.Usuarios;
import org.example.services.EmailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.*;

import org.example.models.Usuarios;
import org.example.services.UsuariosService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/usuarios")
@CrossOrigin(origins = "http://localhost:4200") // Permitir requisições do Angular no localhost
public class UsuariosController {
    @Autowired
    private UsuariosService usuariosService;
    @Autowired
    private EmailService emailService;


    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<Usuarios> usuarioOpt = usuariosService.findByEmail(loginRequest.getEmail());

        if (usuarioOpt.isPresent()) {
            Usuarios usuario = usuarioOpt.get();
            if (usuario.getSenha().equals(loginRequest.getPassword())) {
                String token = "fake-jwt-token";
                // Cria o objeto AuthResponse
                AuthResponse response = new AuthResponse(token, usuario.getId(), usuario.getNomeCompleto(), usuario.getPerfil());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Senha incorreta");
            }
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuário não encontrado");
        }
    }

    public ResponseEntity<Usuarios> register(@RequestBody Usuarios usuario) {
        // Validação e verificação do perfil
        if (usuario.getPerfil() == null ||
                (!usuario.getPerfil().equals("usuario") && !usuario.getPerfil().equals("cliente"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }

        // Criptografar a senha antes de salvar
        usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));

        Usuarios savedUsuario = usuariosService.saveUsuario(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUsuario);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<Usuarios> usuarioOpt = usuariosService.findByEmail(email);

        Map<String, String> response = new HashMap<>();
        if (usuarioOpt.isPresent()) {
            // Conteúdo do e-mail
            String token = UUID.randomUUID().toString(); // Gera um token único
            String resetLink = "http://localhost:4200/reset-password?email=" + email + "&token=" + token;

            String body = "Clique no link para redefinir sua senha: " + resetLink;
            String subject = "Recuperação de Senha";

            // Envia o e-mail de recuperação
            emailService.sendEmail(email, subject, body);

            response.put("message", "Email de recuperação enviado.");
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Usuário não encontrado.");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        Optional<Usuarios> usuarioOpt = usuariosService.findByEmail(request.getEmail());

        if (usuarioOpt.isPresent()) {
            Usuarios usuario = usuarioOpt.get();
            String encodedPassword = passwordEncoder.encode(request.getNewPassword()); // Criptografa a nova senha
            usuario.setSenha(encodedPassword); // Define a nova senha criptografada
            usuariosService.saveUsuario(usuario);

            return ResponseEntity.ok("Senha redefinida com sucesso.");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuário não encontrado.");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer id) {
        Optional<Usuarios> usuario = usuariosService.findById(id);

        if (usuario.isPresent()) {
            usuariosService.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}


