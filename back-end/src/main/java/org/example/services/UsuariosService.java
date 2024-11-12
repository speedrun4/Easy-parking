package org.example.services;
import org.example.models.Usuarios;
import org.example.repositories.UsuariosRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class UsuariosService {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UsuariosRepository usuariosRepository;

    public Optional<Usuarios> findById(Integer id) {
        return usuariosRepository.findById(id);
    }



    public Usuarios saveUsuario(Usuarios usuario) {
        return usuariosRepository.save(usuario);
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
        if (usuariosRepository.existsById(id)) {
            usuariosRepository.deleteById(id);
        } else {
            throw new IllegalArgumentException("Usuário com ID " + id + " não encontrado.");
        }
    }
}
