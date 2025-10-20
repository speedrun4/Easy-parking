package org.example.controllers;

import org.example.dto.AuthResponse;
import org.example.dto.UpdateFotoRequest;
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

import javax.persistence.Column;
import javax.persistence.Lob;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:4200") // Permitir requisições do Angular no localhost
public class UsuariosController {
    @Autowired
    private UsuariosService usuariosService;
    @Autowired
    private EmailService emailService;

    // Mapa estático para armazenar dados temporários de cadastro
    private static final Map<String, Usuarios> cadastroTemp = new HashMap<>();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<Usuarios> usuarioOpt = usuariosService.findByEmail(loginRequest.getEmail());

        if (usuarioOpt.isPresent()) {
            Usuarios usuario = usuarioOpt.get();
            // Usar BCrypt para comparar a senha enviada com o hash no banco
            if (passwordEncoder.matches(loginRequest.getPassword(), usuario.getSenha())) {
                String token = "fake-jwt-token"; // Substitua pelo seu gerador de token real
                // Cria o objeto AuthResponse com email e telefone
                AuthResponse response = new AuthResponse(
                    token,
                    usuario.getId(),
                    usuario.getNomeCompleto(),
                    usuario.getPerfil(),
                    usuario.getEmail(),
                    usuario.getTelefone()
                );
                response.setFotoBase64(usuario.getFotoBase64());
                // LOG extra para debug
                System.out.println("AuthResponse enviado: id=" + response.getId() + ", perfil=" + response.getPerfil());
                if (response.getId() == null || response.getPerfil() == null) {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro: id ou perfil do usuário não definidos no backend!");
                }
                return ResponseEntity.ok(response);
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
        if (usuario.getPerfil() == null ||
                (!usuario.getPerfil().equals("usuario") && !usuario.getPerfil().equals("cliente"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }

        // Gerar código de confirmação
        String codigo = String.valueOf(new Random().nextInt(899999) + 100000); // 6 dígitos
        usuario.setCodigoConfirmacao(codigo);

        // Enviar e-mail com código
        String subject = "Confirmação de cadastro";
        String body = "Seu código de confirmação é: " + codigo;
        emailService.sendEmail(usuario.getEmail(), subject, body);

        // Armazena temporariamente os dados do usuário
        cadastroTemp.put(usuario.getEmail(), usuario);

        // Retorna o usuário (com o código) para o front-end, sem salvar
        return ResponseEntity.ok(usuario);
    }

    @PostMapping("/confirm-email")
    public ResponseEntity<Map<String, String>> confirmEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String codigo = request.get("codigo");
        if (email == null || codigo == null) {
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Preencha todos os campos para confirmar o cadastro.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resp);
        }
        Usuarios usuarioTemp = cadastroTemp.get(email);
        if (usuarioTemp == null) {
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Cadastro não encontrado ou já expirado. Inicie o cadastro novamente.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resp);
        }
        if (usuarioTemp.getCodigoConfirmacao() == null) {
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Código de confirmação não foi gerado. Solicite novo cadastro.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resp);
        }
        if (!codigo.equals(usuarioTemp.getCodigoConfirmacao())) {
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "O código informado está incorreto ou expirou. Verifique e tente novamente.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resp);
        }
        // Remover máscara do CPF antes de salvar
        if (usuarioTemp.getCpf() != null) {
            usuarioTemp.setCpf(usuarioTemp.getCpf().replaceAll("\\D", ""));
        }
        // Criptografar a senha antes de salvar
        usuarioTemp.setSenha(passwordEncoder.encode(usuarioTemp.getSenha()));

        // Verifica se o e-mail já está cadastrado
        Optional<Usuarios> usuarioExistente = usuariosService.findByEmail(email);
        if (usuarioExistente.isPresent()) {
            cadastroTemp.remove(email);
            Map<String, String> resp = new HashMap<>();
            resp.put("message", "Este e-mail já está cadastrado. Faça login ou utilize outro e-mail.");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(resp);
        }

        // Salva o usuário
        usuarioTemp.setCodigoConfirmacao(null); // Limpa o código
        usuariosService.saveUsuario(usuarioTemp);
        cadastroTemp.remove(email); // Remove do temporário
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Cadastro realizado com sucesso! Seu e-mail foi confirmado e você já pode acessar o sistema.");
        return ResponseEntity.ok(resp);
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

    @PutMapping("/{id}/foto")
    public ResponseEntity<?> updateFoto(@PathVariable Integer id, @RequestBody UpdateFotoRequest request) {
        try {
            Optional<Usuarios> usuarioOpt = usuariosService.findById(id);
            if (!usuarioOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Usuário não encontrado");
            }
            usuariosService.updateFoto(id, request.getFotoBase64());
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Foto atualizada com sucesso");
            resp.put("fotoBase64", request.getFotoBase64());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro ao atualizar a foto");
        }
    }
}


