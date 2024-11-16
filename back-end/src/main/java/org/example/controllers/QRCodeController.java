package org.example.controllers;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import org.example.models.ContaBancaria;
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

@RestController
@RequestMapping("/api/pix")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", allowCredentials = "true")
public class QRCodeController {

    private ContaBancaria contaBancaria;

    @PostMapping
    public ResponseEntity<?> gerarCodigoPix(@RequestBody Map<String, Object> body) throws IOException, WriterException {
        Object valorObj = body.get("valor");

        double valor = 0.0;

        if (valorObj instanceof Integer) {
            valor = ((Integer) valorObj).doubleValue();
        } else if (valorObj instanceof Double) {
            valor = (Double) valorObj;
        }

        // Aqui você implementaria a lógica para gerar o código Pix
        String codigoPix = "CÓDIGO_PIX_" + valor;  // Exemplo de código Pix gerado

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

        Map<String, String> response = new HashMap<>();
        response.put("codigoPix", codigoPix);
        response.put("qrCodeBase64", qrCodeBase64);

        return ResponseEntity.ok(response);
    }
}
