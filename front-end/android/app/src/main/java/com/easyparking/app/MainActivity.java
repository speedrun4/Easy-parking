package com.easyparking.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.easyparking.app.plugins.FilePickerPermissionPlugin;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1001;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1002;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(FilePickerPermissionPlugin.class);

        // Pede a permissão de câmera do sistema (popup nativo do Android) assim que o app abre,
        // para que o navegador dentro do app (WebView) consiga usar getUserMedia() sem bloquear.
        requestCameraPermissionIfNeeded();

        // Pede a permissão de localização do sistema assim que o app abre, para que a
        // WebView consiga responder ao navigator.geolocation.getCurrentPosition() sem travar.
        requestLocationPermissionIfNeeded();

        // Habilita a API de geolocalização dentro da WebView (desabilitada por padrão).
        this.bridge.getWebView().getSettings().setGeolocationEnabled(true);

        // Permite que a WebView conceda acesso à câmera para o JavaScript (getUserMedia),
        // já que por padrão o WebView nega qualquer PermissionRequest do site.
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        request.deny();
                        requestCameraPermissionIfNeeded();
                    }
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(
                    final String origin,
                    final GeolocationPermissions.Callback callback) {
                boolean hasFineLocation = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED;
                boolean hasCoarseLocation = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED;

                if (hasFineLocation || hasCoarseLocation) {
                    callback.invoke(origin, true, false);
                } else {
                    callback.invoke(origin, false, false);
                    requestLocationPermissionIfNeeded();
                }
            }
        });
    }

    private void requestCameraPermissionIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.CAMERA},
                    CAMERA_PERMISSION_REQUEST_CODE
            );
        }
    }

    private void requestLocationPermissionIfNeeded() {
        boolean hasFineLocation = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarseLocation = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;

        if (!hasFineLocation && !hasCoarseLocation) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    LOCATION_PERMISSION_REQUEST_CODE
            );
        }
    }
}
