package org.example.repositories;

import org.example.models.MensagemUsuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MensagemUsuarioRepository extends JpaRepository<MensagemUsuario, Long> {
    List<MensagemUsuario> findByDestinatarioIdOrderByCriadaEmDesc(Integer destinatarioId);
    List<MensagemUsuario> findByDestinatarioIdAndLidaFalseOrderByCriadaEmDesc(Integer destinatarioId);

    void deleteByIdAndDestinatarioId(Long id, Integer destinatarioId);
}
