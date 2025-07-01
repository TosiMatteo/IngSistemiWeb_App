package com.example.ingsistemiweb_app.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Gestore personalizzato per il successo dell'autenticazione.
 * Estende `SimpleUrlAuthenticationSuccessHandler` per fornire un comportamento di reindirizzamento flessibile.
 * Determina la pagina di destinazione in base al ruolo dell'utente autenticato dopo un login riuscito.
 */
@Component // Indica a Spring che questa classe è un componente e deve essere gestita dal suo IoC container.
public class CustomAuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        // Metodo chiamato da Spring Security quando un utente si autentica con successo.
        // `authentication` contiene i dettagli dell'utente autenticato e le sue autorità (ruoli).

        // Logga le informazioni base sull'autenticazione per debugging/monitoraggio.
        System.out.println("Login riuscito per: " + authentication.getName()); // Nome utente (email in questo caso).
        System.out.println("Ruoli: " + authentication.getAuthorities()); // Elenco delle autorità (ruoli) dell'utente.

        // Controlla il ruolo dell'utente autenticato per determinare la pagina di destinazione.
        // `authentication.getAuthorities().stream().anyMatch(...)` verifica se l'utente possiede un'autorità specifica.
        if (authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_AMMINISTRATORE"))) {
            setDefaultTargetUrl("/amministratoreDashboard"); //Reindirizza alla dashboard dell'amministratore
        } else if (authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals("ROLE_PROFESSORE"))) {
            setDefaultTargetUrl("/professoreDashboard"); // Reindirizza alla dashboard del professore
        } else {
            // Per tutti gli altri ruoli, reindirizza alla dashboard studente.
            setDefaultTargetUrl("/studenteDashboard");
        }


        // Delega al metodo della classe padre per effettuare il reindirizzamento effettivo.
        // Questo metodo utilizza l'URL di destinazione impostato con `setDefaultTargetUrl`.
        super.onAuthenticationSuccess(request, response, authentication);
    }
}