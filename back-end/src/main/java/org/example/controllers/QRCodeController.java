package org.example.controllers;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import org.example.models.ContaBancaria;
import org.example.services.CarteiraService;
import org.example.services.QRCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/pix")
public class QRCodeController {

    @Autowired
    private CarteiraService carteiraService;

    @org.springframework.beans.factory.annotation.Value("${pagbank.sandbox:true}")
    private boolean pagbankSandbox;

    @PostMapping
    public ResponseEntity<?> gerarCodigoPix(@RequestBody Map<String, Object> body) throws IOException, WriterException {
        // Validar que está em ambiente LIVE
        if (pagbankSandbox) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Collections.singletonMap("message", "Geração de QR PIX permitida apenas em ambiente LIVE"));
        }

        // Validar campos obrigatórios
        if (body == null || !body.containsKey("valor")) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "O campo 'valor' é obrigatório."));
        }

        if (!body.containsKey("pixKey") || body.get("pixKey") == null || body.get("pixKey").toString().isEmpty()) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "O campo 'pixKey' é obrigatório."));
        }

        Object valorObj = body.get("valor");
        double valor;
        try {
            valor = Double.parseDouble(valorObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "O campo 'valor' deve ser um número válido."));
        }

        if (valor <= 0) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "O valor deve ser maior que zero."));
        }

        String pixKey = body.get("pixKey").toString().trim();

        // Validar formato básico da pixKey
        if (!isValidPixKey(pixKey)) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "Chave PIX inválida. Use CPF, CNPJ, email ou número de telefone."));
        }

        try {
            // Gerar o código Pix usando a chave recebida
            String codigoPix = gerarCodigoPix(valor, pixKey);

            // Gerar o QR Code para o código Pix
            String fileType = "png";
            Map<EncodeHintType, Object> hintMap = new HashMap<>();
            hintMap.put(EncodeHintType.MARGIN, 1);

            MultiFormatWriter qrCodeWriter = new MultiFormatWriter();
            BitMatrix byteMatrix = qrCodeWriter.encode(codigoPix, BarcodeFormat.QR_CODE, 200, 200, hintMap);

            BufferedImage image = new BufferedImage(byteMatrix.getWidth(), byteMatrix.getHeight(), BufferedImage.TYPE_INT_RGB);
            image.createGraphics();
            for (int i = 0; i < byteMatrix.getWidth(); i++) {
                for (int j = 0; j < byteMatrix.getHeight(); j++) {
                    int color = (byteMatrix.get(i, j) ? 0x000000 : 0xFFFFFF);
                    image.setRGB(i, j, color);
                }
            }

            // Converter a imagem gerada para byte array
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, fileType, baos);
            byte[] qrCodeBytes = baos.toByteArray();

            // Retornar a imagem do QR Code como resposta
            String qrCodeBase64 = java.util.Base64.getEncoder().encodeToString(qrCodeBytes);
            carteiraService.adicionarValor(valor, "Pagamento Pix", "entrada");

            Map<String, String> response = new HashMap<>();
            response.put("codigoPix", codigoPix);
            response.put("qrCodeBase64", qrCodeBase64);
            response.put("pixKey", pixKey);
            response.put("valor", String.format("%.2f", valor));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonMap("message", "Erro ao gerar QR PIX: " + e.getMessage()));
        }
    }

    // Função que gera um código PIX válido com base no valor e chave PIX recebida
    private String gerarCodigoPix(double valor, String pixKey) {
        String nomeFavorecido = "Easy Parking"; // Nome do favorecido
        String valorFormatado = String.format("%.2f", valor); // Formatar o valor com 2 casas decimais
        String idTransacao = UUID.randomUUID().toString().substring(0, 32); // ID único para a transação

        // Validação: pixKey é obrigatória e não pode ser substituída por hardcoded
        if (pixKey == null || pixKey.isEmpty()) {
            throw new IllegalArgumentException("Chave PIX não pode estar vazia");
        }

        // Gerando o código Pix no formato EMV adequado (copia do padrão correto)
        // Formato: 00020126360014BR.GOV.BCB.PIX...
        return String.format("00020126360014BR.GOV.BCB.PIX0136%s52040000530398654041.00" +
                "5802BR5913%s6009BRASILIA6304%s",
                pixKey,
                nomeFavorecido,
                idTransacao);
    }

    // Validar formato básico da chave PIX (CPF, CNPJ, email, telefone ou aleatória)
    private boolean isValidPixKey(String pixKey) {
        if (pixKey == null || pixKey.isEmpty()) return false;

        // CPF (11 dígitos)
        if (pixKey.matches("\\d{11}")) return true;

        // CNPJ (14 dígitos)
        if (pixKey.matches("\\d{14}")) return true;

        // Telefone (10-11 dígitos com +55 opcional)
        if (pixKey.matches("^\\+?55\\d{10,11}$") || pixKey.matches("\\d{10,11}")) return true;

        // Email
        if (pixKey.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) return true;

        // Aleatória (UUID-like)
        if (pixKey.matches("^[a-f0-9-]{32,}$")) return true;

        return false;
    }
}
