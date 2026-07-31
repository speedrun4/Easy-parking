package org.example.repositories;

import org.example.models.Pagamentos;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PagamentoRepository extends JpaRepository<Pagamentos, Long> {
    List<Pagamentos> findByUsuarioId(Integer usuarioId);
    List<Pagamentos> findByEstacionamento(String estacionamento);

    @Query("SELECT p FROM Pagamentos p WHERE LOWER(TRIM(p.estacionamento)) = LOWER(TRIM(:estacionamento))")
    List<Pagamentos> findByEstacionamentoNormalized(@Param("estacionamento") String estacionamento);

    @Query("SELECT p FROM Pagamentos p WHERE LOWER(TRIM(p.estacionamento)) IN :estacionamentos")
    List<Pagamentos> findByEstacionamentoNormalizedIn(@Param("estacionamentos") List<String> estacionamentos);
}
