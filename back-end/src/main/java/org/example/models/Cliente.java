package org.example.models;
import javax.persistence.*;
import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.example.models.Usuarios;
@Entity
@Table(name = "cliente")
public class Cliente {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    @JsonIgnore
    private Usuarios usuario;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "cliente_seq")
    @SequenceGenerator(name = "cliente_seq", sequenceName = "cliente_sequence", allocationSize = 1)
    private Long id;

    @Column(name = "nome_empresa", nullable = false, length = 255)
    private String nomeEmpresa;

    @Column(nullable = false, length = 14)
    private String cnpj;
    @Column(name = "valor_por_hora", nullable = false)
    private BigDecimal valorPorHora;

    @Column(name = "endereco_completo", length = 255)
    private String enderecoCompleto;

    @Column(name = "cep", length = 9)
    private String cep;

    @Column(name = "cep_filiais", length = 255)
    private String cepFiliais;

    @Column(name = "telefone", length = 15)
    private String telefone;
    @Column(name = "horario_abertura")
    private String horarioAbertura;

    @Column(name = "horario_fechamento")
    private String horarioFechamento;
    // Getters e Setters
    public String getHorarioAbertura() {
        return horarioAbertura;
    }

    public void setHorarioAbertura(String horarioAbertura) {
        this.horarioAbertura = horarioAbertura;
    }

    public String getHorarioFechamento() {
        return horarioFechamento;
    }

    public void setHorarioFechamento(String horarioFechamento) {
        this.horarioFechamento = horarioFechamento;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomeEmpresa() {
        return nomeEmpresa;
    }

    public void setNomeEmpresa(String nomeEmpresa) {
        this.nomeEmpresa = nomeEmpresa;
    }

    public String getCnpj() {
        return cnpj;
    }

    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
    }

    public BigDecimal getValorPorHora() {
        return valorPorHora;
    }

    public void setValorPorHora(BigDecimal valorPorHora) {
        this.valorPorHora = valorPorHora;
    }

    public String getEnderecoCompleto() {
        return enderecoCompleto;
    }

    public void setEnderecoCompleto(String enderecoCompleto) {
        this.enderecoCompleto = enderecoCompleto;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getCepFiliais() {
        return cepFiliais;
    }

    public void setCepFiliais(String cepFiliais) {
        this.cepFiliais = cepFiliais;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }
    // Getters and Setters

    public Usuarios getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuarios usuario) {
        this.usuario = usuario;
    }
}
