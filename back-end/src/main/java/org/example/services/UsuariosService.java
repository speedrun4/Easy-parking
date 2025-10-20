package org.example.services;
import org.example.models.Usuarios;
import org.example.repositories.UsuariosRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import javax.transaction.Transactional;
import java.util.List;
import java.util.Optional;
import org.example.services.ClienteService;
import org.example.services.PagamentoService;
import org.example.models.Cliente;
import org.example.models.Pagamentos;

@Service
public class UsuariosService {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UsuariosRepository usuariosRepository;

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private PagamentoService pagamentoService;

    public Optional<Usuarios> findById(Integer id) {
        return usuariosRepository.findById(id);
    }



    public Usuarios saveUsuario(Usuarios usuario) {
        try {
            return usuariosRepository.save(usuario);
        } catch (Exception e) {
            // Loga o erro para depuração
            System.err.println("Erro ao salvar usuário: " + e.getMessage());
            throw new RuntimeException("Erro ao salvar usuário.", e);
        }
    }

    public List<Usuarios> getAllUsuarios() {
        return usuariosRepository.findAll();
    }
    public Optional<Usuarios> findByEmail(String email) {
        return usuariosRepository.findByEmail(email);
    }
    public Usuarios getUsuarioById(int id) {
        return usuariosRepository.findById(id).orElse(null);
    }

    public void deleteUsuario(int id) {
        usuariosRepository.deleteById(id);
    }

    @Transactional
    public void deleteById(Integer id) {
        if (!usuariosRepository.existsById(id)) {
            throw new IllegalArgumentException("Usuário com ID " + id + " não encontrado.");
        }

        // Deletar todos os clientes e pagamentos relacionados ao usuário
        List<Cliente> clientes = clienteService.getClientesByUsuarioId(id);
        if (clientes != null && !clientes.isEmpty()) {
            for (Cliente cliente : clientes) {
                // Deletar pagamentos relacionados ao cliente
                List<Pagamentos> pagamentos = pagamentoService.listarPorUsuario(id);
                if (pagamentos != null) {
                    for (Pagamentos p : pagamentos) {
                        pagamentoService.deletarPorId(p.getId());
                    }
                }
                // Deletar cliente
                clienteService.deleteCliente(cliente.getId());
            }
        }

        // Por fim, deletar o usuário
        usuariosRepository.deleteById(id);
    }

    public void updateFoto(Integer id, String fotoBase64) {
        Usuarios usuario = usuariosRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));
        usuario.setFotoBase64(fotoBase64);
        usuariosRepository.save(usuario);
    }
}
