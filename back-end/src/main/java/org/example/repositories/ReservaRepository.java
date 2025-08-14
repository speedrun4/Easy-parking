package org.example.repositories;

import org.example.models.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Long> {
    List<Reserva> findByEstacionamentoId(Long estacionamentoId);
    List<Reserva> findByClienteId(Long clienteId);
}
