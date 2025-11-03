package org.example.services;

import org.example.models.Pagamentos;
import org.example.repositories.PagamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Component
public class QrCodeScheduler {

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private PagamentoService pagamentoService;

    // Roda a cada 60 segundos
    @Scheduled(fixedDelay = 60000)
    public void generateExitQRCodesWhenReservationEnds() {
        List<Pagamentos> pagos = pagamentoRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        for (Pagamentos p : pagos) {
            if (p.getStatus() == null || !p.getStatus().equalsIgnoreCase("pago")) continue;
            if (p.getExitQrToken() != null) continue; // já gerado
            LocalDate date = p.getDataReservaEntrada();
            LocalTime endTime = p.getHorarioReservaSaida();
            if (date == null || endTime == null) continue;
            LocalDateTime endDateTime = LocalDateTime.of(date, endTime);
            if (now.isAfter(endDateTime) || now.isEqual(endDateTime)) {
                try {
                    String token = buildToken(p, "exit");
                    String base64 = pagamentoService.generateQrBase64(token);
                    p.setExitQrToken(token);
                    p.setExitQrImageBase64(base64);
                    p.setExitQrStatus("ativo");
                    p.setExitQrCreatedAt(LocalDateTime.now());
                    pagamentoRepository.save(p);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    private String buildToken(Pagamentos p, String type) {
        String payload = String.format("type=%s;paymentId=%d;userId=%d;ts=%d;rand=%s",
                type,
                p.getId(),
                p.getUsuario() != null ? p.getUsuario().getId() : -1,
                System.currentTimeMillis(),
                java.util.UUID.randomUUID());
        return java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
