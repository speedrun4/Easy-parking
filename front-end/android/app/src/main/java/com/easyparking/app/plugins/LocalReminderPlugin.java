package com.easyparking.app.plugins;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.easyparking.app.ReservationAlarmReceiver;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin nativo simples para agendar/cancelar um alarme exato que dispara uma
 * notificação local avisando que a reserva está prestes a vencer (usado pois a
 * instalação de plugins externos via npm está bloqueada neste ambiente).
 */
@CapacitorPlugin(name = "LocalReminder")
public class LocalReminderPlugin extends Plugin {

    @PluginMethod
    public void scheduleReservationAlert(PluginCall call) {
        Integer id = call.getInt("id");
        Long triggerAtMillis = call.getLong("triggerAtMillis");
        String title = call.getString("title", "Sua reserva está acabando");
        String body = call.getString("body", "Faltam 5 minutos para o fim da sua reserva.");
        String route = call.getString("route", "/minhas-reservas");

        if (id == null || triggerAtMillis == null) {
            call.reject("Parâmetros 'id' e 'triggerAtMillis' são obrigatórios.");
            return;
        }

        Context context = getContext();
        Intent intent = new Intent(context, ReservationAlarmReceiver.class);
        intent.putExtra(ReservationAlarmReceiver.EXTRA_ID, id);
        intent.putExtra(ReservationAlarmReceiver.EXTRA_TITLE, title);
        intent.putExtra(ReservationAlarmReceiver.EXTRA_BODY, body);
        intent.putExtra(ReservationAlarmReceiver.EXTRA_ROUTE, route);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("AlarmManager indisponível.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            // Sem permissão de alarmes exatos (Android 12+); agenda de forma aproximada como fallback.
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        }

        call.resolve();
    }

    @PluginMethod
    public void cancelReservationAlert(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("Parâmetro 'id' é obrigatório.");
            return;
        }

        Context context = getContext();
        Intent intent = new Intent(context, ReservationAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
        pendingIntent.cancel();

        JSObject result = new JSObject();
        result.put("cancelled", true);
        call.resolve(result);
    }
}
