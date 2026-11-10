package com.streakup.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * "Find my phone" alarm for the Android app.
 * A web page can't touch the system volume; this native plugin can:
 *  - pushes the ALARM and MEDIA volume to MAX, then puts them back when stopped
 *  - plays the phone's alarm tone on the ALARM channel, which rings even in silent / vibrate mode
 *  - keeps the screen on while the guard is listening
 */
@CapacitorPlugin(name = "FindPhoneAlarm")
public class FindPhoneAlarmPlugin extends Plugin {

    private MediaPlayer player;
    private int savedAlarmVol = -1;
    private int savedMusicVol = -1;

    private AudioManager audio() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        AudioManager am = audio();
        JSObject result = new JSObject();
        try {
            if (savedAlarmVol < 0) {
                savedAlarmVol = am.getStreamVolume(AudioManager.STREAM_ALARM);
                savedMusicVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
            }
            am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
            am.setStreamVolume(AudioManager.STREAM_MUSIC, am.getStreamMaxVolume(AudioManager.STREAM_MUSIC), 0);
            result.put("volumeMaxed", true);
        } catch (SecurityException e) {
            // Some phones refuse volume changes while Do-Not-Disturb is on; the alarm channel still rings
            result.put("volumeMaxed", false);
        }

        try {
            stopPlayer();
            player = new MediaPlayer();
            player.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            player.setDataSource(getContext(), alarmTone());
            player.setLooping(true);
            player.setVolume(1f, 1f);
            player.prepare();
            player.start();
            result.put("playing", true);
        } catch (Exception e) {
            result.put("playing", false);
            result.put("error", e.getMessage());
        }

        vibrate();
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (Build.VERSION.SDK_INT >= 27) {
                getActivity().setShowWhenLocked(true);
                getActivity().setTurnScreenOn(true);
            }
        });
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopPlayer();
        Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null) v.cancel();
        try {
            AudioManager am = audio();
            if (savedAlarmVol >= 0) am.setStreamVolume(AudioManager.STREAM_ALARM, savedAlarmVol, 0);
            if (savedMusicVol >= 0) am.setStreamVolume(AudioManager.STREAM_MUSIC, savedMusicVol, 0);
        } catch (SecurityException ignored) {
        }
        savedAlarmVol = -1;
        savedMusicVol = -1;
        call.resolve();
    }

    /** keepAwake({ on: true }) while the guard listens, so the screen doesn't sleep */
    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", true));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
        call.resolve();
    }

    private Uri alarmTone() {
        Uri uri = RingtoneManager.getActualDefaultRingtoneUri(getContext(), RingtoneManager.TYPE_ALARM);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        return uri;
    }

    private void vibrate() {
        Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        if (v == null) return;
        long[] pattern = {0, 800, 300, 800, 300};
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(pattern, 0));
        else v.vibrate(pattern, 0);
    }

    private void stopPlayer() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
            player.release();
            player = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopPlayer();
    }
}
