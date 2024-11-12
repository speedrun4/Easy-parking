package org.example.dto;

public class AuthResponse {
    private String token;
    private Integer id;
    private String nomeCompleto;
    private String perfil;

    // Construtor com 4 argumentos
    public AuthResponse(String token, Integer id, String nomeCompleto, String perfil) {
        this.token = token;
        this.id = id;
        this.nomeCompleto = nomeCompleto;
        this.perfil = perfil;
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
}
