package org.example.dto;

public class AuthResponse {
    private String token;
    private Integer id;
    private String nomeCompleto;
    private String perfil;
    private String email;
    private String telefone;
    private String fotoBase64;

    // Construtor com todos os argumentos
    public AuthResponse(String token, Integer id, String nomeCompleto, String perfil, String email, String telefone) {
        this.token = token;
        this.id = id;
        this.nomeCompleto = nomeCompleto;
        this.perfil = perfil;
        this.email = email;
        this.telefone = telefone;
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

    // Getters e Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

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
}
