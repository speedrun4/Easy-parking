package org.example.controllers;

import org.example.models.Reserva;
import org.example.services.ReservaService;
import org.example.models.Cliente;
import org.example.services.ClienteService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservas")
public class ReservaController {
    private static final Logger logger = LoggerFactory.getLogger(ReservaController.class);
    @Autowired
    private ReservaService reservaService;
    @Autowired
    private ClienteService clienteService;

    @PostMapping
    public ResponseEntity<Reserva> criarReserva(@RequestBody Reserva reserva) {
        logger.info("Recebendo requisição para criar reserva: clienteId={}, estacionamentoId={}, horario={}",
                reserva.getCliente() != null ? reserva.getCliente().getId() : null,
                reserva.getEstacionamento() != null ? reserva.getEstacionamento().getId() : null,
                reserva.getHorario());
        // Garante que cliente e estacionamento existem
        Cliente cliente = clienteService.getClienteById(reserva.getCliente().getId());
        Cliente estacionamento = clienteService.getClienteById(reserva.getEstacionamento().getId());
        if (cliente == null || estacionamento == null) {
            logger.warn("Cliente ou estacionamento não encontrado. clienteId={}, estacionamentoId={}",
                reserva.getCliente() != null ? reserva.getCliente().getId() : null,
                reserva.getEstacionamento() != null ? reserva.getEstacionamento().getId() : null);
            return ResponseEntity.badRequest().build();
        }
        reserva.setCliente(cliente);
        reserva.setEstacionamento(estacionamento);
        Reserva novaReserva = reservaService.criarReserva(reserva);
        logger.info("Reserva criada com sucesso: id={}, clienteId={}, estacionamentoId={}, horario={}",
                novaReserva.getId(),
                novaReserva.getCliente() != null ? novaReserva.getCliente().getId() : null,
                novaReserva.getEstacionamento() != null ? novaReserva.getEstacionamento().getId() : null,
                novaReserva.getHorario());
        return ResponseEntity.ok(novaReserva);
    }

    @GetMapping("/estacionamento/{estacionamentoId}")
    public ResponseEntity<List<Reserva>> getReservasPorEstacionamento(@PathVariable Long estacionamentoId) {
        logger.info("Buscando reservas para estacionamentoId={}", estacionamentoId);
        List<Reserva> reservas = reservaService.getReservasPorEstacionamento(estacionamentoId);
        logger.info("Reservas encontradas: {}", reservas.size());
        for (Reserva r : reservas) {
            logger.info("Reserva: id={}, clienteId={}, estacionamentoId={}, horario={}",
                r.getId(),
                r.getCliente() != null ? r.getCliente().getId() : null,
                r.getEstacionamento() != null ? r.getEstacionamento().getId() : null,
                r.getHorario());
        }
        return ResponseEntity.ok(reservas);
    }
}
