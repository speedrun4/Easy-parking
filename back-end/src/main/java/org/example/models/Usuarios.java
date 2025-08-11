package org.example.models;

import javax.persistence.*;

@Entity // Indica que esta classe é uma entidade JPA
@Table(name = "usuarios") // (opcional) Nome da tabela
public class Usuarios {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Geração automática do ID

    private Integer id;
    private String nomeCompleto;
    private String email;
    private String telefone;
    private String senha;
    private String cpf;
    private String perfil;
    @Column(name = "foto")
    @Lob
    private String fotoBase64; // Foto em base64
    private String codigoConfirmacao;
    // Construtores
    public Usuarios() {}

    public Usuarios(Integer id, String nomeCompleto, String email, String telefone, String senha, String cpf) {
        this.id = id;
        this.nomeCompleto = nomeCompleto;
        this.email = email;
        this.telefone = telefone;
        this.senha = senha;
        this.cpf = cpf;
        this.perfil = perfil;
    }

    // Getters e Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNomeCompleto() {
        return nomeCompleto;
    }

    public void setNomeCompleto(String nomeCompleto) {
        this.nomeCompleto = nomeCompleto;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }
    public String getPerfil() {
        return perfil;
    }

    public void setPerfil(String perfil) {
        this.perfil = perfil;
    }

    public String getFotoBase64() {
        return fotoBase64;
    }

    public void setFotoBase64(String fotoBase64) {
        this.fotoBase64 = fotoBase64;
    }

    public String getCodigoConfirmacao() {
        return codigoConfirmacao;
    }

    public void setCodigoConfirmacao(String codigoConfirmacao) {
        this.codigoConfirmacao = codigoConfirmacao;
    }

}
