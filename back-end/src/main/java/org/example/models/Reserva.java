package org.example.models;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Reserva {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "estacionamento_id")
    private Cliente estacionamento;

    private LocalDateTime horario;

    // Getters e setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }

    public Cliente getEstacionamento() { return estacionamento; }
    public void setEstacionamento(Cliente estacionamento) { this.estacionamento = estacionamento; }

    public LocalDateTime getHorario() { return horario; }
    public void setHorario(LocalDateTime horario) { this.horario = horario; }
}
