package com.ccpl.erp;

import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class ConfigActivity extends AppCompatActivity {

    private EditText ipInput;
    private EditText portInput;

    private static final String PREFS_NAME = "CCPLERPPrefs";
    private static final String KEY_SERVER_IP = "server_ip";
    private static final String KEY_SERVER_PORT = "server_port";
    private static final String DEFAULT_PORT = "5173";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_config);

        ipInput = findViewById(R.id.ipInput);
        portInput = findViewById(R.id.portInput);
        Button saveButton = findViewById(R.id.saveButton);
        Button cancelButton = findViewById(R.id.cancelButton);

        // Load existing config
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedIp = prefs.getString(KEY_SERVER_IP, "");
        String savedPort = prefs.getString(KEY_SERVER_PORT, DEFAULT_PORT);

        ipInput.setText(savedIp);
        portInput.setText(savedPort);

        saveButton.setOnClickListener(v -> saveConfig());
        cancelButton.setOnClickListener(v -> finish());
    }

    private void saveConfig() {
        String ip = ipInput.getText().toString().trim();
        String port = portInput.getText().toString().trim();

        if (ip.isEmpty()) {
            Toast.makeText(this, "Please enter the server IP address", Toast.LENGTH_SHORT).show();
            return;
        }

        if (port.isEmpty()) {
            port = DEFAULT_PORT;
        }

        // Validate IP format (basic check)
        if (!isValidIpOrHostname(ip)) {
            Toast.makeText(this, "Please enter a valid IP address or hostname", Toast.LENGTH_SHORT).show();
            return;
        }

        // Validate port
        try {
            int portNum = Integer.parseInt(port);
            if (portNum < 1 || portNum > 65535) {
                Toast.makeText(this, "Port must be between 1 and 65535", Toast.LENGTH_SHORT).show();
                return;
            }
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Invalid port number", Toast.LENGTH_SHORT).show();
            return;
        }

        // Save config
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString(KEY_SERVER_IP, ip);
        editor.putString(KEY_SERVER_PORT, port);
        editor.apply();

        Toast.makeText(this, "Configuration saved!", Toast.LENGTH_SHORT).show();
        finish();
    }

    private boolean isValidIpOrHostname(String input) {
        // Basic validation - allows IP addresses and hostnames
        if (input == null || input.isEmpty()) {
            return false;
        }

        // Check if it looks like an IP address
        String ipPattern = "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
        if (input.matches(ipPattern)) {
            return true;
        }

        // Check if it's a valid hostname (basic check)
        String hostnamePattern = "^[a-zA-Z0-9]([a-zA-Z0-9\\-\\.]*[a-zA-Z0-9])?$";
        return input.matches(hostnamePattern);
    }
}
