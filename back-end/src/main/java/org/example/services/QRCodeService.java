package org.example.services;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.util.Hashtable;

@Service
public class QRCodeService {

    private static final int WIDTH = 300;  // Largura do QR Code
    private static final int HEIGHT = 300; // Altura do QR Code

    public BufferedImage generateQRCodeImage(String text) throws Exception {
        // Definindo os parâmetros de codificação
        Hashtable<EncodeHintType, Object> hintMap = new Hashtable<>();
        hintMap.put(EncodeHintType.MARGIN, 1);  // margem de 1

        // Gerando o código QR em formato de matriz de bits
        BitMatrix matrix = new MultiFormatWriter().encode(text, BarcodeFormat.QR_CODE, WIDTH, HEIGHT, hintMap);

        // Convertendo a matriz de bits para uma imagem
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < WIDTH; x++) {
            for (int y = 0; y < HEIGHT; y++) {
                image.setRGB(x, y, matrix.get(x, y) ? 0x000000 : 0xFFFFFF); // Preto para "1" e branco para "0"
            }
        }

        return image;
    }
}
