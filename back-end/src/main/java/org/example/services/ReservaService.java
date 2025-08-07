package org.example.services;

import org.example.models.Reserva;
import org.example.repositories.ReservaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReservaService {
    @Autowired
    private ReservaRepository reservaRepository;

    public Reserva criarReserva(Reserva reserva) {
        return reservaRepository.save(reserva);
    }

    public List<Reserva> getReservasPorEstacionamento(Long estacionamentoId) {
        return reservaRepository.findByEstacionamentoId(estacionamentoId);
    }
}
