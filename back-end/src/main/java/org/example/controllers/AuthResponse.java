package org.example.controllers;

public class AuthResponse {
    private String token;
    private String nomeCompleto;
    private String perfil; // Incluímos o campo perfil

    // Construtor com 3 argumentos
    public AuthResponse(String token, String nomeCompleto, String perfil) {
        this.token = token;
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
