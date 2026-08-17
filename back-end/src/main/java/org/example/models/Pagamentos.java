package org.example.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "pagamentos")
public class Pagamentos {
    @Column(name = "status")
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Usuarios usuario;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;

    @Column(name = "forma_pagamento")
    private String formaPagamento;

    @Column(name = "valor_pago")
    private BigDecimal valorPago;

    private LocalTime horario;
    private LocalDate data;

    private String estacionamento;

    private Double latitude;
    private Double longitude;
    private String endereco;

    // QR Codes de entrada/saída
    @Column(name = "entry_qr_token")
    private String entryQrToken;

    @Lob
    @Column(name = "entry_qr_image_base64", columnDefinition = "LONGTEXT")
    private String entryQrImageBase64;

    @Column(name = "entry_qr_status")
    private String entryQrStatus; // ativo, consumido, expirado

    @Column(name = "entry_qr_created_at")
    private java.time.LocalDateTime entryQrCreatedAt;

    @Column(name = "entry_qr_consumed_at")
    private java.time.LocalDateTime entryQrConsumedAt;

    @Column(name = "exit_qr_token")
    private String exitQrToken;

    @Lob
    @Column(name = "exit_qr_image_base64", columnDefinition = "LONGTEXT")
    private String exitQrImageBase64;

    @Column(name = "exit_qr_status")
    private String exitQrStatus; // pendente, ativo, consumido, expirado

    @Column(name = "exit_qr_created_at")
    private java.time.LocalDateTime exitQrCreatedAt;

    @Column(name = "exit_qr_consumed_at")
    private java.time.LocalDateTime exitQrConsumedAt;

    // --- PagBank integration fields ---
    @Column(name = "pagbank_order_id")
    private String pagbankOrderId;

    @Column(name = "pagbank_charge_id")
    private String pagbankChargeId;

    @Column(name = "pagbank_status")
    private String pagbankStatus; // WAITING, PAID, etc

    @Column(name = "pix_gateway_provider")
    private String pixGatewayProvider; // MERCADO_PAGO, PAGBANK, STATIC

    @Lob
    @Column(name = "pagbank_qr_base64", columnDefinition = "LONGTEXT")
    private String pagbankQrBase64; // imagem do QR retornada pelo PagBank

    @Lob
    @Column(name = "pagbank_qr_payload", columnDefinition = "LONGTEXT")
    private String pagbankQrPayload; // texto copia e cola

    // Novos campos para reserva
    @Column(name = "data_reserva_entrada")
    private LocalDate dataReservaEntrada;

    @Column(name = "horario_reserva_entrada")
    private LocalTime horarioReservaEntrada;

    @Column(name = "horario_reserva_saida")
    private LocalTime horarioReservaSaida;
    public LocalDate getDataReservaEntrada() {
        return dataReservaEntrada;
    }

    public void setDataReservaEntrada(LocalDate dataReservaEntrada) {
        this.dataReservaEntrada = dataReservaEntrada;
    }

    public LocalTime getHorarioReservaEntrada() {
        return horarioReservaEntrada;
    }

    public void setHorarioReservaEntrada(LocalTime horarioReservaEntrada) {
        this.horarioReservaEntrada = horarioReservaEntrada;
    }

    public LocalTime getHorarioReservaSaida() {
        return horarioReservaSaida;
    }

    public void setHorarioReservaSaida(LocalTime horarioReservaSaida) {
        this.horarioReservaSaida = horarioReservaSaida;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getFormaPagamento() {
        return formaPagamento;
    }

    public void setFormaPagamento(String formaPagamento) {
        this.formaPagamento = formaPagamento;
    }

    public BigDecimal getValorPago() {
        return valorPago;
    }

    public void setValorPago(BigDecimal valorPago) {
        this.valorPago = valorPago;
    }

    public LocalTime getHorario() {
        return horario;
    }

    public void setHorario(LocalTime horario) {
        this.horario = horario;
    }

    public LocalDate getData() {
        return data;
    }

    public void setData(LocalDate data) {
        this.data = data;
    }

    public String getEstacionamento() {
        return estacionamento;
    }

    public void setEstacionamento(String estacionamento) {
        this.estacionamento = estacionamento;
    }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getEndereco() { return endereco; }
    public void setEndereco(String endereco) { this.endereco = endereco; }
    public Usuarios getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuarios usuario) {
        this.usuario = usuario;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getEntryQrToken() { return entryQrToken; }
    public void setEntryQrToken(String entryQrToken) { this.entryQrToken = entryQrToken; }

    public String getEntryQrImageBase64() { return entryQrImageBase64; }
    public void setEntryQrImageBase64(String entryQrImageBase64) { this.entryQrImageBase64 = entryQrImageBase64; }

    public String getEntryQrStatus() { return entryQrStatus; }
    public void setEntryQrStatus(String entryQrStatus) { this.entryQrStatus = entryQrStatus; }

    public java.time.LocalDateTime getEntryQrCreatedAt() { return entryQrCreatedAt; }
    public void setEntryQrCreatedAt(java.time.LocalDateTime entryQrCreatedAt) { this.entryQrCreatedAt = entryQrCreatedAt; }

    public java.time.LocalDateTime getEntryQrConsumedAt() { return entryQrConsumedAt; }
    public void setEntryQrConsumedAt(java.time.LocalDateTime entryQrConsumedAt) { this.entryQrConsumedAt = entryQrConsumedAt; }

    public String getExitQrToken() { return exitQrToken; }
    public void setExitQrToken(String exitQrToken) { this.exitQrToken = exitQrToken; }

    public String getExitQrImageBase64() { return exitQrImageBase64; }
    public void setExitQrImageBase64(String exitQrImageBase64) { this.exitQrImageBase64 = exitQrImageBase64; }

    public String getExitQrStatus() { return exitQrStatus; }
    public void setExitQrStatus(String exitQrStatus) { this.exitQrStatus = exitQrStatus; }

    public java.time.LocalDateTime getExitQrCreatedAt() { return exitQrCreatedAt; }
    public void setExitQrCreatedAt(java.time.LocalDateTime exitQrCreatedAt) { this.exitQrCreatedAt = exitQrCreatedAt; }

    public java.time.LocalDateTime getExitQrConsumedAt() { return exitQrConsumedAt; }
    public void setExitQrConsumedAt(java.time.LocalDateTime exitQrConsumedAt) { this.exitQrConsumedAt = exitQrConsumedAt; }

    public String getPagbankOrderId() { return pagbankOrderId; }
    public void setPagbankOrderId(String pagbankOrderId) { this.pagbankOrderId = pagbankOrderId; }

    public String getPagbankChargeId() { return pagbankChargeId; }
    public void setPagbankChargeId(String pagbankChargeId) { this.pagbankChargeId = pagbankChargeId; }

    public String getPagbankStatus() { return pagbankStatus; }
    public void setPagbankStatus(String pagbankStatus) { this.pagbankStatus = pagbankStatus; }

    public String getPixGatewayProvider() { return pixGatewayProvider; }
    public void setPixGatewayProvider(String pixGatewayProvider) { this.pixGatewayProvider = pixGatewayProvider; }

    public String getPagbankQrBase64() { return pagbankQrBase64; }
    public void setPagbankQrBase64(String pagbankQrBase64) { this.pagbankQrBase64 = pagbankQrBase64; }

    public String getPagbankQrPayload() { return pagbankQrPayload; }
    public void setPagbankQrPayload(String pagbankQrPayload) { this.pagbankQrPayload = pagbankQrPayload; }
}
