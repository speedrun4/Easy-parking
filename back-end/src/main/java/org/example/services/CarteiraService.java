package org.example.services;

import org.example.models.Carteira;
import org.example.repositories.CarteiraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CarteiraService {
    @Autowired
    private CarteiraRepository carteiraRepository;

    public Carteira adicionarValor(double valorAdicionado, String descricao, String tipo) {
        if (valorAdicionado <= 0) {
            throw new IllegalArgumentException("O valor deve ser maior que zero");
        }
        // Criação de uma nova transação de carteira
        Carteira carteira = new Carteira();
        carteira.setValorAdicionado(valorAdicionado);
        carteira.setDescricao(descricao);
        carteira.setTipo(tipo);
        carteira.setData(new java.util.Date()); // Define a data atual

        // Atualiza o saldo
        carteira.setSaldo(calcularSaldo(valorAdicionado, tipo));

        // Salva a transação no banco
        return carteiraRepository.save(carteira);
    }

    private double calcularSaldo(double valorAdicionado, String tipo) {
        // Aqui você pode buscar o saldo atual e adicionar o valor conforme o tipo
        double saldoAtual = 0.0;  // Supondo que você queira pegar o saldo atual antes de adicionar
        // Por exemplo: saldoAtual = buscarSaldoAtual();

        // Se for uma entrada, adiciona o valor ao saldo
        if ("entrada".equals(tipo)) {
            saldoAtual += valorAdicionado;
        } else if ("saída".equals(tipo)) {
            saldoAtual -= valorAdicionado;
        }

        return saldoAtual;
    }
}
