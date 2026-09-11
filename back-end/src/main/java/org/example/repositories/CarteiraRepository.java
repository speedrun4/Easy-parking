package org.example.repositories;


import org.example.models.Carteira;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CarteiraRepository extends JpaRepository<Carteira, Long> {
    List<Carteira> findByUsuarioIdOrderByDataDesc(Integer usuarioId);
    List<Carteira> findByUsuarioIdOrderByDataAsc(Integer usuarioId);
}