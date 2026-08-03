package org.example.repositories;
import org.example.models.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    List<Cliente> findByUsuarioId(Integer usuarioId);
    Optional<Cliente> findByIdAndUsuarioId(Long id, Integer usuarioId);
}
