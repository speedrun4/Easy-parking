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
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pix")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", allowCredentials = "true")
public class QRCodeController {

    @Autowired
    private CarteiraService carteiraService;

    @PostMapping
    public ResponseEntity<?> gerarCodigoPix(@RequestBody Map<String, Object> body) throws IOException, WriterException {
        if (body == null || !body.containsKey("valor")) {
            return ResponseEntity.badRequest().body("O campo 'valor' é obrigatório.");
        }

        Object valorObj = body.get("valor");
        double valor;
        try {
            valor = Double.parseDouble(valorObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("O campo 'valor' deve ser um número válido.");
        }


//        double valor = 0.0;
        if (valorObj instanceof Integer) {
            valor = ((Integer) valorObj).doubleValue();
        } else if (valorObj instanceof Double) {
            valor = (Double) valorObj;
        }

        // Gerar o código Pix real com base no valor
        String codigoPix = gerarCodigoPix(valor);

        // Gerar o QR Code para o código Pix
        String qrCodeData = codigoPix;
        String fileType = "png";
        Map<EncodeHintType, Object> hintMap = new HashMap<>();
        hintMap.put(EncodeHintType.MARGIN, 1);

        MultiFormatWriter qrCodeWriter = new MultiFormatWriter();
        BitMatrix byteMatrix = qrCodeWriter.encode(qrCodeData, BarcodeFormat.QR_CODE, 200, 200, hintMap);

        BufferedImage image = new BufferedImage(byteMatrix.getWidth(), byteMatrix.getHeight(), BufferedImage.TYPE_INT_RGB);
        image.createGraphics();
        for (int i = 0; i < byteMatrix.getWidth(); i++) {
            for (int j = 0; j < byteMatrix.getHeight(); j++) {
                int color = (byteMatrix.get(i, j) ? 0x000000 : 0xFFFFFF);  // Definir a cor (preto ou branco)
                image.setRGB(i, j, color);
            }
        }

        // Converter a imagem gerada para byte array
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, fileType, baos);
        byte[] qrCodeBytes = baos.toByteArray();

        // Retornar a imagem do QR Code como resposta (base64 encoded, por exemplo)
        String qrCodeBase64 = java.util.Base64.getEncoder().encodeToString(qrCodeBytes);
        carteiraService.adicionarValor(valor, "Pagamento Pix", "entrada");

        Map<String, String> response = new HashMap<>();
        response.put("codigoPix", codigoPix);
        response.put("qrCodeBase64", qrCodeBase64);

        return ResponseEntity.ok(response);
    }

    // Função que gera um código PIX válido com base no valor
    private String gerarCodigoPix(double valor) {
        // Chave PIX do favorecido (simulada aqui, no formato de um CPF ou CNPJ)
        String chavePix = "05121324456"; // Substitua com uma chave real
        String nomeFavorecido = "Francisco Moura Junior"; // Nome do favorecido
        String idTransacao = UUID.randomUUID().toString(); // ID único para a transação
        String valorFormatado = String.format("%.2f", valor); // Formatar o valor com 2 casas decimais

        // Gerando o código Pix no formato adequado
        return String.format("00020126360014BR.GOV.BCB.PIX01021234567890123456789012345678901234567890123456789052040000" +
                "530398654041.00" + // Valor
                "5802BR" +
                "5925%s" + // Nome do favorecido
                "6009BR" +
                "5914%s" + // Nome do favorecido
                "62070503***6304ABCD", valorFormatado, nomeFavorecido); // Finalizando com o código de validação
    }
}
