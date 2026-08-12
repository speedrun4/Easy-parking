package org.example.services;

import org.example.models.Pagamentos;
import org.example.repositories.PagamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

@Service
public class PagamentoService {

    @Autowired
    private PagamentoRepository repository;

    @Autowired
    private QRCodeService qrCodeService;

    @Value("${pagbank.email}")
    private String pagbankEmail;

    @Value("${pagbank.token}")
    private String pagbankToken;

    @Value("${pagbank.sandbox:true}")
    private boolean pagbankSandbox;

    @Value("${pix.key:}")
    private String pixDefaultKey;

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private PagBankClient pagBankClient;

    public Pagamentos salvarPagamento(Pagamentos pagamento) {
        Pagamentos saved = repository.save(pagamento);

        // Se for forma de pagamento PIX via PagBank e ainda não tiver integração
        if ("PIX".equalsIgnoreCase(saved.getFormaPagamento()) && saved.getPagbankStatus() == null) {
            boolean hasPagBankCredentials = pagBankClient.hasConfiguredCredentials();
            if (hasPagBankCredentials) {
                try {
                    criarCobrancaPagBank(saved);
                } catch (Exception e) {
                    throw new RuntimeException("Falha ao criar cobrança PIX no PagBank: " + e.getMessage(), e);
                }
            } else {
                saved.setPagbankStatus("WAITING");
                repository.save(saved);
            }
            saved = ensurePixDisplayData(saved, null);
        }
        // Gera QR de entrada se ainda não existir
        if (saved.getEntryQrToken() == null) {
            try {
                String token = buildToken(saved, "entry");
                String base64 = generateQrBase64(token);
                saved.setEntryQrToken(token);
                saved.setEntryQrImageBase64(base64);
                saved.setEntryQrStatus("ativo");
                saved.setEntryQrCreatedAt(java.time.LocalDateTime.now());
                repository.save(saved);
            } catch (Exception e) {
                // Log simples; em um cenário real, use um logger
                e.printStackTrace();
            }
        }
        return saved;
    }

    public Pagamentos ensurePixDisplayData(Pagamentos pagamento, String pixKeyOverride) {
        if (pagamento == null) {
            return null;
        }
        if (!"PIX".equalsIgnoreCase(pagamento.getFormaPagamento())) {
            return pagamento;
        }
        String existingPayload = pagamento.getPagbankQrPayload();
        boolean hasValidPayload = existingPayload != null
                && !existingPayload.isEmpty()
                && existingPayload.startsWith("000201");
        if (pagamento.getPagbankQrBase64() != null && !pagamento.getPagbankQrBase64().isEmpty() && hasValidPayload) {
            return pagamento;
        }

        String pixKey = (pixKeyOverride != null && !pixKeyOverride.trim().isEmpty())
                ? pixKeyOverride.trim()
                : (pixDefaultKey != null ? pixDefaultKey.trim() : "");
        if (pixKey.isEmpty()) {
            return pagamento;
        }

        try {
            String pixPayload = buildPixPayload(pagamento, pixKey);
            pagamento.setPagbankQrPayload(pixPayload);
            pagamento.setPagbankQrBase64(generateQrBase64(pixPayload));
            if (pagamento.getPagbankStatus() == null || pagamento.getPagbankStatus().isEmpty()) {
                pagamento.setPagbankStatus("WAITING");
            }
            return repository.save(pagamento);
        } catch (Exception e) {
            e.printStackTrace();
            return pagamento;
        }
    }

    private String buildPixPayload(Pagamentos pagamento, String pixKey) {
        String merchantName = normalizePixText("Easy Parking", 25);
        String merchantCity = normalizePixText("Recife", 15);
        String txId = normalizeTxId(pagamento != null ? pagamento.getId() : null);
        String amount = formatPixAmount(pagamento != null ? pagamento.getValorPago() : null);

        String merchantAccountInfo = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", pixKey);
        String additionalDataField = tlv("05", txId);

        String payloadWithoutCrc = ""
                + tlv("00", "01")
                + tlv("01", "12")
                + tlv("26", merchantAccountInfo)
                + tlv("52", "0000")
                + tlv("53", "986")
                + tlv("54", amount)
                + tlv("58", "BR")
                + tlv("59", merchantName)
                + tlv("60", merchantCity)
                + tlv("62", additionalDataField)
                + "6304";

        return payloadWithoutCrc + crc16(payloadWithoutCrc);
    }

    private String normalizeTxId(Long paymentId) {
        String base = paymentId != null ? "PAY" + paymentId : UUID.randomUUID().toString().replace("-", "");
        base = base.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (base.isEmpty()) {
            base = "EASYPARK";
        }
        return base.length() > 25 ? base.substring(0, 25) : base;
    }

    private String normalizePixText(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String normalized = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^A-Za-z0-9 ]", "")
                .trim()
                .toUpperCase();
        if (normalized.length() > maxLength) {
            return normalized.substring(0, maxLength);
        }
        return normalized;
    }

    private String formatPixAmount(BigDecimal value) {
        BigDecimal normalized = value != null ? value : BigDecimal.ONE;
        return normalized.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private String tlv(String id, String value) {
        String safeValue = value != null ? value : "";
        return id + String.format("%02d", safeValue.length()) + safeValue;
    }

    private String crc16(String payload) {
        int crc = 0xFFFF;
        for (byte currentByte : payload.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (currentByte & 0xFF) << 8;
            for (int bit = 0; bit < 8; bit++) {
                if ((crc & 0x8000) != 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }
        return String.format("%04X", crc);
    }
    public List<Pagamentos> listarTodos() {
        return repository.findAll();
    }

    public List<Pagamentos> listarPorUsuario(Integer usuarioId) {
        return repository.findByUsuarioId(usuarioId);
    }

    public void deletarPorId(Long id) {
        repository.deleteById(id);
    }

    private String buildToken(Pagamentos p, String type) {
        // Payload simples com informações mínimas
        String payload = String.format("type=%s;paymentId=%d;userId=%d;ts=%d;rand=%s",
                type,
                p.getId(),
                p.getUsuario() != null ? p.getUsuario().getId() : -1,
                System.currentTimeMillis(),
                UUID.randomUUID());
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    }

    public String generateQrBase64(String content) throws Exception {
        java.awt.image.BufferedImage image = qrCodeService.generateQRCodeImage(content);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "png", baos);
        byte[] bytes = baos.toByteArray();
        return java.util.Base64.getEncoder().encodeToString(bytes);
    }

    public Pagamentos reconcileEntryQrState(Pagamentos p) {
        if (p == null) return null;

        String status = p.getEntryQrStatus();
        if (status != null && status.equalsIgnoreCase("consumido")) {
            return hideEntryQr(p);
        }

        java.time.LocalDateTime startDateTime = getEntryStartDateTime(p);
        if (startDateTime != null && java.time.LocalDateTime.now().isAfter(startDateTime.plusMinutes(5))) {
            p.setEntryQrStatus("expirado");
            return hideEntryQr(p);
        }

        return p;
    }

    private java.time.LocalDateTime getEntryStartDateTime(Pagamentos p) {
        if (p == null || p.getDataReservaEntrada() == null || p.getHorarioReservaEntrada() == null) {
            return null;
        }
        return java.time.LocalDateTime.of(p.getDataReservaEntrada(), p.getHorarioReservaEntrada());
    }

    private Pagamentos hideEntryQr(Pagamentos p) {
        boolean changed = false;
        if (p.getEntryQrToken() != null) {
            p.setEntryQrToken(null);
            changed = true;
        }
        if (p.getEntryQrImageBase64() != null) {
            p.setEntryQrImageBase64(null);
            changed = true;
        }
        return changed ? repository.save(p) : p;
    }

    // Gera o QR de entrada se ainda não existir (uso oportunista no endpoint de consulta)
    public Pagamentos ensureEntryQr(Pagamentos p) {
        if (p == null) return null;
        p = reconcileEntryQrState(p);
        if (p.getEntryQrStatus() != null && (p.getEntryQrStatus().equalsIgnoreCase("consumido") || p.getEntryQrStatus().equalsIgnoreCase("expirado"))) {
            return p;
        }
        java.time.LocalDateTime startDateTime = getEntryStartDateTime(p);
        if (startDateTime != null && java.time.LocalDateTime.now().isAfter(startDateTime.plusMinutes(5))) {
            p.setEntryQrStatus("expirado");
            return hideEntryQr(p);
        }
        if (p.getEntryQrToken() != null) return p;
        try {
            String token = buildToken(p, "entry");
            String base64 = generateQrBase64(token);
            p.setEntryQrToken(token);
            p.setEntryQrImageBase64(base64);
            p.setEntryQrStatus("ativo");
            p.setEntryQrCreatedAt(java.time.LocalDateTime.now());
            return repository.save(p);
        } catch (Exception e) {
            e.printStackTrace();
            return p;
        }
    }

    // Se já passou do horário de saída e ainda não tem QR de saída, gera agora
    public Pagamentos ensureExitQrIfDue(Pagamentos p) {
        if (p == null) return null;
        if (p.getExitQrToken() != null) return p;
        if (p.getStatus() == null || !p.getStatus().equalsIgnoreCase("pago")) return p;
        if (p.getDataReservaEntrada() == null || p.getHorarioReservaSaida() == null) return p;
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        java.time.LocalDateTime endDateTime = java.time.LocalDateTime.of(p.getDataReservaEntrada(), p.getHorarioReservaSaida());
        if (now.isBefore(endDateTime)) return p;
        try {
            String token = buildToken(p, "exit");
            String base64 = generateQrBase64(token);
            p.setExitQrToken(token);
            p.setExitQrImageBase64(base64);
            p.setExitQrStatus("ativo");
            p.setExitQrCreatedAt(java.time.LocalDateTime.now());
            return repository.save(p);
        } catch (Exception e) {
            e.printStackTrace();
            return p;
        }
    }

    // Cria cobrança PIX simples via PagBank (usando token de integração)
    private void criarCobrancaPagBank(Pagamentos p) throws Exception {
        // Validar que está em ambiente LIVE
        if (pagbankSandbox) {
            throw new IllegalStateException("Cobrança PIX só pode ser criada em ambiente LIVE. Configure pagbank.sandbox=false");
        }

        int cents = p.getValorPago() != null ? p.getValorPago().multiply(new java.math.BigDecimal(100)).intValue() : 100;
        java.util.Map<String, Object> map = pagBankClient.createPixCharge("PAY-" + p.getId(), cents, "Easy-Park pagamento " + p.getId());
        Object chargeId = map.get("id");
        p.setPagbankChargeId(chargeId != null ? chargeId.toString() : null);
        p.setPagbankStatus(String.valueOf(map.getOrDefault("status", "WAITING")));

        Object qr = map.get("qr_code");
        if (qr instanceof java.util.Map) {
            Object qrBase64 = ((java.util.Map<?,?>) qr).get("base64");
            Object qrText = ((java.util.Map<?,?>) qr).get("text");
            if (qrBase64 != null) p.setPagbankQrBase64(qrBase64.toString());
            if (qrText != null) p.setPagbankQrPayload(qrText.toString());
        }
        repository.save(p);
    }
}
