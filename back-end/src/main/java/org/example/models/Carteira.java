package org.example.models;

import javax.persistence.*;
import java.util.Date;

@Entity
public class Carteira {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double saldo;                // O saldo total da carteira
    private String descricao;            // Descrição da transação
    private Double valorAdicionado;      // O valor adicionado à carteira (exemplo: pagamento Pix)
    private Double valorRetirado;        // O valor retirado da carteira (se houver)

    @Temporal(TemporalType.TIMESTAMP)
    private Date data;                   // Data da transação

    private String tipo;
    // Tipo de transação: "entrada" (adicionado) ou "saída" (retirado)

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuarios usuario;

    // Getters e setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Double getSaldo() {
        return saldo;
    }

    public void setSaldo(Double saldo) {
        this.saldo = saldo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public Double getValorAdicionado() {
        return valorAdicionado;
    }

    public void setValorAdicionado(Double valorAdicionado) {
        this.valorAdicionado = valorAdicionado;
    }

    public Double getValorRetirado() {
        return valorRetirado;
    }

    public void setValorRetirado(Double valorRetirado) {
        this.valorRetirado = valorRetirado;
    }

    public Date getData() {
        return data;
    }

    public void setData(Date data) {
        this.data = data;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }
}