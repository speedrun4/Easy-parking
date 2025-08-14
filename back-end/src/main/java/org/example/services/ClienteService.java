// ...existing code...
package org.example.services;

import org.example.models.Cliente;
import org.example.repositories.ClienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class ClienteService {

    @Autowired
    private ClienteRepository clienteRepository;

    public List<Cliente> getAllClientes() {
        return clienteRepository.findAll();
    }

    public Cliente saveCliente(Cliente cliente) {
        if (cliente.getNomeEmpresa() == null || cliente.getNomeEmpresa().isEmpty()) {
            throw new IllegalArgumentException("Nome da empresa não pode ser vazio");
        }
        return clienteRepository.save(cliente);
    }

    public List<Cliente> getClientesByUsuarioId(Integer usuarioId) {
        return clienteRepository.findByUsuarioId(usuarioId);
    }

    public Cliente getClienteById(Long id) {
        return clienteRepository.findById(id).orElse(null);
    }

    public void deleteCliente(Long id) {
        clienteRepository.deleteById(id);
    }
}
