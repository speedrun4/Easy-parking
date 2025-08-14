package org.example.repositories;
import org.example.models.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    List<Cliente> findByUsuarioId(Integer usuarioId);
}
