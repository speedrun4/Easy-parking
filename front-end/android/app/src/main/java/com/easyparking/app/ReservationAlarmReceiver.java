package com.easyparking.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/**
 * Recebe o alarme agendado por LocalReminderPlugin e exibe a notificação nativa
 * avisando que a reserva está prestes a vencer. Ao tocar na notificação, abre o
 * app diretamente na tela de "Minhas Reservas" (via query param lido no Angular).
 */
public class ReservationAlarmReceiver extends BroadcastReceiver {

    public static final String EXTRA_ID = "extra_id";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_BODY = "extra_body";
    public static final String EXTRA_ROUTE = "extra_route";

    private static final String CHANNEL_ID = "reservation_alerts";

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra(EXTRA_ID, 0);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        String route = intent.getStringExtra(EXTRA_ROUTE);
        if (route == null) {
            route = "/minhas-reservas";
        }

        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Alertas de reserva",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Avisos de que sua reserva está prestes a vencer.");
            notificationManager.createNotificationChannel(channel);
        }

        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openAppIntent.putExtra(MainActivity.EXTRA_NAVIGATE_ROUTE, route);

        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                id,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentIntent);

        notificationManager.notify(id, builder.build());
    }
}
