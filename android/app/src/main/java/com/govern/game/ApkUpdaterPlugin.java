package com.govern.game;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Downloads the newest GOVERN APK into the app cache and hands it to Android's package installer. */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private File apkFile() {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, "GOVERN.apk");
    }

    private boolean mayInstall() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        return getContext().getPackageManager().canRequestPackageInstalls();
    }

    @PluginMethod
    public void setOrientation(PluginCall call) {
        final String mode = call.getString("mode", "auto");
        final android.app.Activity a = getActivity();
        if (a == null) { call.resolve(); return; }
        a.runOnUiThread(() -> {
            int o = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_FULL_USER;
            if ("portrait".equals(mode)) o = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT;
            else if ("landscape".equals(mode)) o = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE;
            a.setRequestedOrientation(o);
        });
        call.resolve();
    }

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject r = new JSObject();
        r.put("allowed", mayInstall());
        call.resolve(r);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("Invalid download address");
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setInstanceFollowRedirects(true);
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(30000);
                    int code = c.getResponseCode();
                    // GitHub redirects release downloads to another host; follow manually if needed.
                    int hops = 0;
                    while ((code == 301 || code == 302 || code == 303 || code == 307 || code == 308) && hops < 5) {
                        String loc = c.getHeaderField("Location");
                        c.disconnect();
                        c = (HttpURLConnection) new URL(loc).openConnection();
                        c.setConnectTimeout(15000);
                        c.setReadTimeout(30000);
                        code = c.getResponseCode();
                        hops++;
                    }
                    if (code != 200) {
                        call.reject("Server answered " + code);
                        return;
                    }
                    long total = c.getContentLengthLong();
                    File out = apkFile();
                    File tmp = new File(out.getParentFile(), "GOVERN.part");
                    InputStream in = c.getInputStream();
                    FileOutputStream fo = new FileOutputStream(tmp);
                    byte[] buf = new byte[32768];
                    long done = 0;
                    int lastPct = -1;
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        fo.write(buf, 0, n);
                        done += n;
                        if (total > 0) {
                            int pct = (int) (done * 100 / total);
                            if (pct != lastPct) {
                                lastPct = pct;
                                JSObject p = new JSObject();
                                p.put("pct", pct);
                                p.put("bytes", done);
                                p.put("total", total);
                                notifyListeners("progress", p);
                            }
                        }
                    }
                    fo.close();
                    in.close();
                    if (total > 0 && done != total) {
                        tmp.delete();
                        call.reject("Download was incomplete");
                        return;
                    }
                    if (out.exists()) out.delete();
                    if (!tmp.renameTo(out)) {
                        call.reject("Could not save the update");
                        return;
                    }
                    JSObject r = new JSObject();
                    r.put("bytes", done);
                    call.resolve(r);
                } catch (Exception e) {
                    call.reject("Download failed: " + e.getMessage());
                } finally {
                    if (c != null) c.disconnect();
                }
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        File f = apkFile();
        if (!f.exists()) {
            call.reject("Update file is missing. Download it again.");
            return;
        }
        if (!mayInstall()) {
            call.reject("NEEDS_PERMISSION");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start the installer: " + e.getMessage());
        }
    }
}
