package fr.bectaly.mpp;

import android.graphics.Color;
import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.WebView;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Dernière hauteur utile appliquée au conteneur de la WebView (px, ou MATCH_PARENT), pour ne
    // relayouter que lorsqu'elle change (le global layout listener se déclenche très souvent).
    private int usableHeightPrevious = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyDarkNavigationBar();
        exposeSafeAreaTop();
        enableKeyboardResize();
    }

    // Sous Android 10 (API < 30), l'apparence des boutons de la barre de navigation repose sur un flag
    // de systemUiVisibility du decorView, qui peut être réécrasé pendant le démarrage (transition du
    // splash, chargement de la WebView) → boutons restés sombres, invisibles sur le fond noir. On la
    // ré-applique donc à chaque prise de focus de la fenêtre. Inutile en API 30+ (API moderne stable),
    // mais sans effet de bord.
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyDarkNavigationBar();
        }
    }

    // Barre de navigation Android (3 boutons) : NOIRE avec boutons blancs dans tous les thèmes (rendu
    // historique voulu). On fixe explicitement la couleur + l'apparence des boutons.
    private void applyDarkNavigationBar() {
        Window window = getWindow();
        window.setNavigationBarColor(Color.BLACK);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        // false = fond de barre considéré comme sombre → le système dessine des boutons CLAIRS (blancs).
        controller.setAppearanceLightNavigationBars(false);
        // Renfort API < 30 : on efface directement le flag « light » sur le decorView, car le compat ne
        // le maintient pas toujours sur ces versions (le flag est mutable et peut être réécrasé).
        if (Build.VERSION.SDK_INT < 30) {
            View decor = window.getDecorView();
            int flags = decor.getSystemUiVisibility();
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            decor.setSystemUiVisibility(flags);
        }
    }

    // Sur Android 9/10 (API < 30), la WebView renvoie souvent env(safe-area-inset-top) = 0 alors que le
    // contenu est dessiné sous la barre d'état → le header remonte trop haut (titre trop proche de la
    // caméra). On lit la hauteur réelle des barres système et on l'injecte dans une variable CSS
    // (--safe-top-native), que le thème combine avec env() via max().
    //
    // UNIQUEMENT sur API < 30. Poser un OnApplyWindowInsetsListener sur la WebView REMPLACE son traitement
    // natif des insets : elle ne calcule alors plus env(safe-area-inset-*) elle-même. Sur API < 30 c'est
    // sans conséquence (env() était déjà cassé, on le supplée). Mais sur API ≥ 30 — surtout Android 15/16
    // (API ≥ 35) où l'edge-to-edge est FORCÉ par l'OS — cela « affamerait » env(safe-area-inset-bottom)
    // (→ 0), et la navbar de l'app passerait sous la barre de navigation système. Sur ces versions, la
    // WebView (Capacitor ≥ 8.4) gère nativement les insets : on ne s'en mêle pas.
    private void exposeSafeAreaTop() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return;
        }
        final WebView webView = getBridge().getWebView();
        final float density = getResources().getDisplayMetrics().density;
        // IMPORTANT : listener posé sur la WEBVIEW (enfant), PAS sur le decorView. Le decorView dessine
        // lui-même le fond des barres système via son propre onApplyWindowInsets ; lui voler ce callback
        // rend les barres transparentes (nav bar illisible). On lit donc les insets côté WebView, et on
        // utilise getRootWindowInsets pour obtenir la valeur brute (non consommée en amont).
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            WindowInsetsCompat rootInsets = ViewCompat.getRootWindowInsets(view);
            if (rootInsets != null) {
                int topPx = rootInsets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
                int topDp = Math.round(topPx / density);
                webView.evaluateJavascript(
                    "document.documentElement.style.setProperty('--safe-top-native', '" + topDp + "px')",
                    null
                );
            }
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    // Réplique native de « adjustResize », UNIQUEMENT sur Android < 11 (API < 30). Sur ces versions, les
    // insets IME ne sont pas délivrés en edge-to-edge : ni adjustResize, ni le plugin Keyboard
    // (resizeOnFullScreen) ne redimensionnent la WebView → le contenu du bas reste caché derrière le
    // clavier. On le fait donc nous-mêmes, via un OnGlobalLayoutListener (fiable toutes versions) qui
    // rétrécit le conteneur de la WebView à la hauteur visible dès qu'un clavier occupe le bas de l'écran.
    // Résultat : TOUT le contenu (navbar, inputs, boutons, barre de saisie du chat) remonte naturellement.
    //
    // Sur API 30+, l'inset IME est fiable et adjustResize (cf. AndroidManifest) redimensionne déjà seul :
    // on NE fait rien ici, sinon on cumulerait deux redimensionnements (contenu poussé 2× trop haut +
    // bloc vide de la taille du clavier).
    private void enableKeyboardResize() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return;
        }
        final View content = getWindow().getDecorView().findViewById(android.R.id.content);
        if (!(content instanceof ViewGroup)) {
            return;
        }
        final View child = ((ViewGroup) content).getChildAt(0);
        if (child == null) {
            return;
        }
        content.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            Rect visible = new Rect();
            child.getWindowVisibleDisplayFrame(visible);
            int rootHeight = child.getRootView().getHeight();
            // Détection « clavier ouvert » au seuil de hauteur masquée en bas (méthode classique) : les
            // insets IME ne sont pas fiables ici. En dessous du seuil, il ne reste que la barre système.
            boolean keyboardShown = (rootHeight - visible.bottom) > rootHeight * 0.15f;
            // Clavier ouvert → hauteur utile (même calcul que le plugin : bas visible en plein écran,
            // sinon hauteur visible). Fermé → pleine hauteur (edge-to-edge sous la barre système).
            int usableNow = keyboardShown
                ? (isOverlays() ? visible.bottom : visible.height())
                : ViewGroup.LayoutParams.MATCH_PARENT;
            if (usableNow != usableHeightPrevious) {
                child.getLayoutParams().height = usableNow;
                child.requestLayout();
                usableHeightPrevious = usableNow;
            }
        });
    }

    // Le contenu est-il dessiné en plein écran (sous la barre de statut) ? Détermine, comme dans le
    // plugin Keyboard, la façon de calculer la hauteur utile quand le clavier est ouvert.
    @SuppressWarnings("deprecation")
    private boolean isOverlays() {
        return (getWindow().getDecorView().getSystemUiVisibility() & View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
            == View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
    }
}
