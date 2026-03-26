package com.cloudplay;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

// Permite que o HTML/JS acesse funções nativas do Android
// como abrir o seletor de arquivos e fazer upload
public class AndroidBridge {

    private Context context;

    public AndroidBridge(Context context) {
        this.context = context;
    }

    // Abre o seletor de arquivos do Android
    @JavascriptInterface
    public void pickFile() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        ((MainActivity) context).startActivityForResult(
            Intent.createChooser(intent, "Selecionar jogo"),
            1001
        );
    }

    // Mostra uma mensagem toast
    @JavascriptInterface
    public void showToast(String message) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
    }

    // Retorna o IP do servidor salvo nas preferências
    @JavascriptInterface
    public String getServerUrl() {
        return context.getSharedPreferences("cloudplay", Context.MODE_PRIVATE)
            .getString("server_url", "");
    }

    // Salva o IP do servidor
    @JavascriptInterface
    public void saveServerUrl(String url) {
        context.getSharedPreferences("cloudplay", Context.MODE_PRIVATE)
            .edit().putString("server_url", url).apply();
    }
}

