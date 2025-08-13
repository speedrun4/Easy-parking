package org.example.controllers;

import org.example.dto.ClienteDTO;
import org.example.models.Cliente;
import org.example.services.ClienteService;
import org.example.models.Usuarios;
import org.example.repositories.UsuariosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import java.util.List;

@RestController
@RequestMapping("api/clientes")
@CrossOrigin(origins = "http://localhost:4200") // Permite o domínio do frontend
public class ClienteController {

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<?> getClienteByUsuarioId(@PathVariable Integer usuarioId) {
        try {
            Cliente cliente = clienteService.getClienteByUsuarioId(usuarioId);
            if (cliente != null) {
                return ResponseEntity.ok(cliente);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cliente não encontrado para o usuarioId: " + usuarioId);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro ao buscar cliente: " + e.getMessage());
        }
    }

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private UsuariosRepository usuariosRepository;
    @GetMapping
    public ResponseEntity<List<Cliente>> getAllClientes() {
        try {
            List<Cliente> clientes = clienteService.getAllClientes();
            return ResponseEntity.ok(clientes);
        } catch (Exception e) {
            // Logando a exceção para detalhes
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }


    @PostMapping
    public ResponseEntity<?> createCliente(@Valid @RequestBody ClienteDTO clienteDTO) {
        try {
            System.out.println("Criando cliente com: " + clienteDTO); // Log para verificar os dados recebidos
            Cliente cliente = new Cliente();
            cliente.setNomeEmpresa(clienteDTO.getNomeEmpresa());
            cliente.setCnpj(clienteDTO.getCnpj());
            cliente.setEnderecoCompleto(clienteDTO.getEnderecoCompleto());
            cliente.setCep(clienteDTO.getCep());
            cliente.setCepFiliais(clienteDTO.getCepFiliais());
            cliente.setTelefone(clienteDTO.getTelefone());
            cliente.setValorPorHora(clienteDTO.getValorPorHora());
            cliente.setHorarioAbertura(clienteDTO.getHorarioAbertura());
            cliente.setHorarioFechamento(clienteDTO.getHorarioFechamento());

            // Vínculo com usuário
            if (clienteDTO.getUsuarioId() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Usuário não informado.");
            }
            Integer usuarioIdInt;
            try {
                usuarioIdInt = Math.toIntExact(clienteDTO.getUsuarioId());
            } catch (ArithmeticException ex) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("ID de usuário inválido.");
            }
            Usuarios usuario = usuariosRepository.findById(usuarioIdInt)
                    .orElse(null);
            if (usuario == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Usuário não encontrado.");
            }
            cliente.setUsuario(usuario);

            Cliente savedCliente = clienteService.saveCliente(cliente);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedCliente);
        } catch (IllegalArgumentException e) {
            System.out.println("Erro de validação: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro ao criar o cliente.");
        }
    }
    // Additional endpoints as needed
}
