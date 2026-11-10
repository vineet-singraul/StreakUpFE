package com.streakup.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FindPhoneAlarmPlugin.class); // native max-volume alarm for "Phone Dhundo"
        super.onCreate(savedInstanceState);
    }
}
