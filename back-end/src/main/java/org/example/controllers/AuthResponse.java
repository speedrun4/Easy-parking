package org.example.controllers;

public class AuthResponse {
    private String token;
    private String nomeCompleto;

    // Construtor
    public AuthResponse(String token, String nomeCompleto) {
        this.token = token;
        this.nomeCompleto = nomeCompleto;
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
}
