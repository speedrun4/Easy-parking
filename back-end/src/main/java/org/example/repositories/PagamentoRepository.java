package org.example.repositories;

import org.example.models.Pagamentos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PagamentoRepository extends JpaRepository<Pagamentos, Long> {
    List<Pagamentos> findByUsuarioId(Integer usuarioId);
    List<Pagamentos> findByEstacionamento(String estacionamento);
}
