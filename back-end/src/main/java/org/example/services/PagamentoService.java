package org.example.services;

import org.example.models.Pagamentos;
import org.example.repositories.PagamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

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

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Autowired
    private RestTemplate restTemplate;

    public Pagamentos salvarPagamento(Pagamentos pagamento) {
        Pagamentos saved = repository.save(pagamento);

        // Se for forma de pagamento PIX via PagBank e ainda não tiver integração
        if ("PIX".equalsIgnoreCase(saved.getFormaPagamento()) && saved.getPagbankStatus() == null) {
            try {
                criarCobrancaPagBank(saved);
            } catch (Exception e) {
                e.printStackTrace();
            }
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

    // Gera o QR de entrada se ainda não existir (uso oportunista no endpoint de consulta)
    public Pagamentos ensureEntryQr(Pagamentos p) {
        if (p == null) return null;
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
    String baseUrl = pagbankSandbox ? "https://sandbox.api.pagseguro.com" : "https://api.pagseguro.com";
    String chargesEndpoint = baseUrl + "/charges"; // endpoint simplificado (pode variar conforme API PagBank)

        // Corpo mínimo da requisição (ajuste conforme documentação oficial PagBank)
        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.put("reference_id", "PAY-" + p.getId());
        java.util.Map<String, Object> amount = new java.util.HashMap<>();
        amount.put("value", p.getValorPago() != null ? p.getValorPago().multiply(new java.math.BigDecimal(100)).intValue() : 100); // em centavos
        amount.put("currency", "BRL");
        body.put("amount", amount);
        body.put("description", "Easy-Park pagamento " + p.getId());
        body.put("payment_method", java.util.Collections.singletonMap("type", "PIX"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(pagbankToken);
        HttpEntity<java.util.Map<String,Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.exchange(chargesEndpoint, HttpMethod.POST, entity, String.class);
        int status = response.getStatusCodeValue();
        String resp = response.getBody();

        if (response.getStatusCode().is2xxSuccessful()) {
            // Parse resposta para extrair ids e payload PIX
            java.util.Map<?,?> map = MAPPER.readValue(resp, java.util.Map.class);
            Object chargeId = map.get("id");
            p.setPagbankChargeId(chargeId != null ? chargeId.toString() : null);
            p.setPagbankStatus("WAITING");

            // Alguns retornos trazem um objeto "qr_code" com campos base64 e text
            Object qr = map.get("qr_code");
            if (qr instanceof java.util.Map) {
                Object qrBase64 = ((java.util.Map<?,?>) qr).get("base64");
                Object qrText = ((java.util.Map<?,?>) qr).get("text");
                if (qrBase64 != null) p.setPagbankQrBase64(qrBase64.toString());
                if (qrText != null) p.setPagbankQrPayload(qrText.toString());
            }
            repository.save(p);
        } else {
            System.err.println("Erro ao criar cobrança PagBank: " + status + " - " + resp);
        }
    }
}
