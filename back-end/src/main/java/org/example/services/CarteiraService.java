package org.example.services;

import org.example.models.Carteira;
import org.example.models.Usuarios;
import org.example.repositories.CarteiraRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CarteiraService {
    @Autowired
    private CarteiraRepository carteiraRepository;

    public Carteira adicionarValor(Usuarios usuario, double valor, String descricao, String tipoOperacao) {
        return registrarTransacao(usuario, valor, descricao, "entrada");
    }

    public Carteira removerValor(Usuarios usuario, double valor, String descricao) {
        return registrarTransacao(usuario, valor, descricao, "saida");
    }

    private Carteira registrarTransacao(Usuarios usuario, double valor, String descricao, String tipo) {
        if (valor <= 0) {
            throw new IllegalArgumentException("O valor deve ser maior que zero");
        }

        double saldoAtual = obterSaldoAtual(usuario.getId());
        double novoSaldo = "entrada".equals(tipo) ? saldoAtual + valor : saldoAtual - valor;

        Carteira transacao = new Carteira();
        transacao.setUsuario(usuario);
        transacao.setDescricao(descricao);
        transacao.setTipo(tipo);
        transacao.setData(new java.util.Date());
        if ("entrada".equals(tipo)) {
            transacao.setValorAdicionado(valor);
        } else {
            transacao.setValorRetirado(valor);
        }
        transacao.setSaldo(novoSaldo);

        return carteiraRepository.save(transacao);
    }

    public double obterSaldoAtual(Integer usuarioId) {
        List<Carteira> historico = carteiraRepository.findByUsuarioIdOrderByDataDesc(usuarioId);
        if (historico.isEmpty()) {
            return 0.0;
        }
        Double saldo = historico.get(0).getSaldo();
        return saldo != null ? saldo : 0.0;
    }

    public List<Carteira> obterHistorico(Integer usuarioId) {
        return carteiraRepository.findByUsuarioIdOrderByDataAsc(usuarioId);
    }
}
