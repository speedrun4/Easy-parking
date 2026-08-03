package org.example.models;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mensagens_usuario")
public class MensagemUsuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "remetente_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "senha", "cpf", "codigoConfirmacao", "fotoBase64"})
    private Usuarios remetente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinatario_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "senha", "cpf", "codigoConfirmacao", "fotoBase64"})
    private Usuarios destinatario;

    @Lob
    @Column(name = "conteudo", nullable = false)
    private String conteudo;

    @Column(name = "lida", nullable = false)
    private Boolean lida = false;

    @Column(name = "criada_em", nullable = false)
    private LocalDateTime criadaEm;

    @PrePersist
    public void prePersist() {
        if (criadaEm == null) {
            criadaEm = LocalDateTime.now();
        }
        if (lida == null) {
            lida = false;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuarios getRemetente() {
        return remetente;
    }

    public void setRemetente(Usuarios remetente) {
        this.remetente = remetente;
    }

    public Usuarios getDestinatario() {
        return destinatario;
    }

    public void setDestinatario(Usuarios destinatario) {
        this.destinatario = destinatario;
    }

    public String getConteudo() {
        return conteudo;
    }

    public void setConteudo(String conteudo) {
        this.conteudo = conteudo;
    }

    public Boolean getLida() {
        return lida;
    }

    public void setLida(Boolean lida) {
        this.lida = lida;
    }

    public LocalDateTime getCriadaEm() {
        return criadaEm;
    }

    public void setCriadaEm(LocalDateTime criadaEm) {
        this.criadaEm = criadaEm;
    }
}
