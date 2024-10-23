package org.example;
import org.example.models.Cliente;
import org.example.models.Cliente;
import org.example.services.ClienteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequestMapping("/clientes")
@CrossOrigin(origins = "http://localhost:4200") // Permitir requisições do Angular no localhost
@SpringBootApplication
@RestController
public class Main {
    // Injeção de dependência do ClienteService
    @Autowired
    private ClienteService clienteService;

    public static void main(String[] args) {
        SpringApplication.run(Main.class, args);
    }

    @PostMapping("/clientes")
    public Cliente createCliente(@RequestBody Cliente cliente) {
        return clienteService.saveCliente(cliente);
    }

    @GetMapping
    public List<Cliente> getAllClientes() {
        return clienteService.getAllClientes();
    }
}