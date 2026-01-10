package com.ccpl.erp;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorLayout;
    private TextView errorText;
    private SwipeRefreshLayout swipeRefresh;
    private ValueCallback<Uri[]> fileUploadCallback;
    private String serverUrl;

    private static final String PREFS_NAME = "CCPLERPPrefs";
    private static final String KEY_SERVER_IP = "server_ip";
    private static final String KEY_SERVER_PORT = "server_port";
    private static final String DEFAULT_PORT = "5173";

    private final ActivityResultLauncher<Intent> fileChooserLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (fileUploadCallback != null) {
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        String dataString = result.getData().getDataString();
                        if (dataString != null) {
                            results = new Uri[]{Uri.parse(dataString)};
                        }
                    }
                    fileUploadCallback.onReceiveValue(results);
                    fileUploadCallback = null;
                }
            }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        errorLayout = findViewById(R.id.errorLayout);
        errorText = findViewById(R.id.errorText);
        swipeRefresh = findViewById(R.id.swipeRefresh);

        Button retryButton = findViewById(R.id.retryButton);
        Button configButton = findViewById(R.id.configButton);

        retryButton.setOnClickListener(v -> loadWebApp());
        configButton.setOnClickListener(v -> openConfig());

        // Swipe to refresh
        swipeRefresh.setOnRefreshListener(() -> {
            webView.reload();
            swipeRefresh.setRefreshing(false);
        });

        setupWebView();
        loadServerConfig();
        loadWebApp();
    }

    private void loadServerConfig() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String ip = prefs.getString(KEY_SERVER_IP, "");
        String port = prefs.getString(KEY_SERVER_PORT, DEFAULT_PORT);

        if (ip.isEmpty()) {
            // First run - open config
            openConfig();
        } else {
            serverUrl = "http://" + ip + ":" + port;
        }
    }

    private void openConfig() {
        Intent intent = new Intent(this, ConfigActivity.class);
        startActivity(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Reload config when returning from settings
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String ip = prefs.getString(KEY_SERVER_IP, "");
        String port = prefs.getString(KEY_SERVER_PORT, DEFAULT_PORT);

        if (!ip.isEmpty()) {
            String newUrl = "http://" + ip + ":" + port;
            if (!newUrl.equals(serverUrl)) {
                serverUrl = newUrl;
                loadWebApp();
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();

        // Enable JavaScript
        webSettings.setJavaScriptEnabled(true);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Enable DOM storage
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);

        // Enable caching
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAppCacheEnabled(true);

        // Enable zoom
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);

        // Viewport settings
        webSettings.setUseWideViewPort(true);
        webSettings.setLoadWithOverviewMode(true);

        // Allow file access
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // Mixed content (HTTP & HTTPS)
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // User agent
        String userAgent = webSettings.getUserAgentString();
        webSettings.setUserAgentString(userAgent + " CCPL-ERP-Android-App");

        // Enable cookies
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        // WebView client
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                progressBar.setVisibility(View.VISIBLE);
                errorLayout.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(View.GONE);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    progressBar.setVisibility(View.GONE);
                    webView.setVisibility(View.GONE);
                    errorLayout.setVisibility(View.VISIBLE);
                    errorText.setText("Cannot connect to server.\n\nMake sure:\n• Server is running\n• IP address is correct\n• You're on the same network\n\nServer: " + serverUrl);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // Handle external links
                if (!url.startsWith(serverUrl)) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                return false;
            }
        });

        // Chrome client for file uploads
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                fileUploadCallback = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    fileUploadCallback = null;
                    Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });
    }

    private void loadWebApp() {
        if (serverUrl == null || serverUrl.isEmpty()) {
            errorLayout.setVisibility(View.VISIBLE);
            webView.setVisibility(View.GONE);
            errorText.setText("Server not configured.\nPlease set the server IP address.");
            return;
        }

        errorLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        webView.loadUrl(serverUrl);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Handle back button - go back in WebView history
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
