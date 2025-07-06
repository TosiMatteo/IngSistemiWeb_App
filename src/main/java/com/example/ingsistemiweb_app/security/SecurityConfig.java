package com.example.ingsistemiweb_app.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.password.NoOpPasswordEncoder; // ATTENZIONE: Questo è un encoder non sicuro!
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;

/**
 * Configurazione principale della sicurezza dell'applicazione Spring Security.
 * Questa classe definisce le regole di accesso (autorizzazione), la gestione del form di login,
 * del logout e la gestione delle eccezioni di autenticazione.
 */
@Configuration // Indica che questa classe contiene definizioni di bean e configurazioni per Spring.
@EnableWebSecurity // Abilita l'integrazione di Spring Security con la configurazione web.
public class SecurityConfig {

    @Autowired // Inietta il gestore personalizzato per il successo dell'autenticazione.
    private CustomAuthenticationSuccessHandler successHandler;

    /**
     * Configura la catena di filtri di sicurezza (SecurityFilterChain).
     * Questo è il punto centrale dove vengono definite le regole di autorizzazione e il comportamento di login/logout.
     * @param http L'oggetto HttpSecurity, utilizzato per configurare la sicurezza web.
     * @return SecurityFilterChain configurato.
     * @throws Exception In caso di errori durante la configurazione.
     */
    @Bean // Indica che il valore di ritorno di questo metodo deve essere registrato come un bean nel contesto Spring.
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth // Inizia la configurazione delle regole di autorizzazione delle richieste HTTP.
                        // --- Permessi Pubblici (permitAll) ---
                        // Permette l'accesso pubblico all'endpoint di invio email.
                        .requestMatchers("/send-email").permitAll()
                        // Permette l'accesso pubblico a pagine statiche e di login/registrazione.
                        // È importante che CSS, JS e immagini siano accessibili senza autenticazione.
                        .requestMatchers("/", "/login", "/registrazione", "/css/**", "/javascript/**", "/index", "/images/**", "/send-email").permitAll()
                        // Permette l'accesso pubblico all'API per i posti occupati delle aule (potrebbe essere usata da chiunque).
                        // Se hai API pubbliche per gli studenti (es. per visualizzare disponibilità), assicurati che siano qui.
                        .requestMatchers("/api/aule/*/posti-occupati").permitAll()

                        // --- Permessi basati sui Ruoli (hasRole) ---
                        // Richiede il ruolo STUDENTE (corrisponde a "ROLE_STUDENTE") per tutti gli URL che iniziano con /studente/.
                        .requestMatchers("/studente/**").hasRole("STUDENTE")
                        // Richiede il ruolo AMMINISTRATORE (corrisponde a "ROLE_AMMINISTRATORE") per tutti gli URL che iniziano con /admin/.
                        // Questo proteggerà le tue pagine HTML per l'admin (es. /admin/users, /admin/annunci, /amministratoreDashboard).
                        .requestMatchers("/admin/**", "/amministratoreDashboard").hasRole("AMMINISTRATORE")
                        // Richiede il ruolo PROFESSORE (corrisponde a "ROLE_PROFESSORE") per tutti gli URL che iniziano con /professore/.
                        .requestMatchers("/professore/**", "/professoreDashboard").hasRole("PROFESSORE") // Aggiunto /professoreDashboard
                        // Permetti a tutti di leggere gli annunci attivi
                        .requestMatchers("/api/annunci/attivi").permitAll()

                        // *** AGGIUNGI QUESTE REGOLE PER PROTEGGERE LE NUOVE API ADMIN E PROFESSORI ***
                        // Le API di Admin (es. /api/admin/users, /api/admin/prenotazioni)
                        .requestMatchers("/api/admin/**").hasRole("AMMINISTRATORE")
                        // Le API di Professore (se ne hai in futuro o le sposti sotto /api/professore)
                        .requestMatchers("/api/professore/**").hasRole("PROFESSORE")
                        // Le API di Studente (se ne hai in futuro o le sposti sotto /api/studente)
                        .requestMatchers("/api/studente/**").hasRole("STUDENTE")

                        // Le API delle aule che necessitano di autenticazione o ruoli specifici
                        // 1. Permetti a QUALSIASI utente autenticato di VEDERE la disponibilità
                        .requestMatchers(HttpMethod.GET, "/api/aule/*/disponibilita").authenticated()
                        // 2. Riserva TUTTE le altre operazioni su /api/aule/ (es. creazione, modifica) solo agli ADMIN
                        .requestMatchers("/api/aule/**").hasRole("AMMINISTRATORE")
                        // Fine delle nuove regole

                        // Solo gli ADMIN possono gestire gli annunci (crea, aggiorna, disattiva, elimina, tutti gli annunci)
                        // Questa regola è ora parzialmente ridondante con /api/admin/** se gli annunci sono lì,
                        // ma male non fa se hai altri annunci non sotto /api/admin.
                        .requestMatchers("/api/annunci/**").hasRole("AMMINISTRATORE")


                        // --- Regola di Default ---
                        // Tutte le altre richieste non specificatamente permesse o con ruoli richiesti,
                        // richiedono che l'utente sia autenticato (non anonimo).
                        .anyRequest().authenticated()
                )
                .formLogin(form -> form // Configura l'autenticazione basata su form.
                        // Specifica l'URL della pagina di login personalizzata.
                        .loginPage("/login")
                        // Specifica l'URL a cui il form di login deve inviare i dati (Spring Security lo intercetta).
                        .loginProcessingUrl("/login")
                        // Usa il `CustomAuthenticationSuccessHandler` per gestire il reindirizzamento dopo un login di successo.
                        .successHandler(successHandler)
                        // Specifica l'URL a cui reindirizzare in caso di fallimento del login.
                        .failureUrl("/login?error=true")
                        // Permette l'accesso a tutti alla pagina di login e al relativo endpoint di elaborazione.
                        .permitAll()
                )
                .logout(logout -> logout // Configura la funzionalità di logout.
                        // Specifica l'URL a cui reindirizzare dopo un logout di successo.
                        .logoutSuccessUrl("/login?logout=true")
                        // Permette l'accesso a tutti all'endpoint di logout.
                        .permitAll()
                )
                .exceptionHandling(ex -> ex // Configura la gestione delle eccezioni di sicurezza.
                        // Specifica l'AuthenticationEntryPoint da usare quando un utente non autenticato cerca di accedere a una risorsa protetta.
                        // Reindirizza alla pagina di login.
                        .authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login"))
                )
        ;

        return http.build(); // Costruisce e restituisce l'oggetto `SecurityFilterChain`.
    }

    /**
     * Configura l'encoder per le password.
     * ATTENZIONE: `NoOpPasswordEncoder` è un encoder che non esegue alcuna operazione di hashing sulla password.
     * Ciò significa che le password vengono memorizzate e confrontate in chiaro.
     * È **estremamente insicuro** e dovrebbe essere usato **SOLO PER SCOPI DI SVILUPPO/TEST**.
     * In un ambiente di produzione, è **imperativo** usare un encoder robusto come `BCryptPasswordEncoder`
     * o `Pbkdf2PasswordEncoder` per proteggere le password degli utenti.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        // CONSIDERARE SERIAMENTE L'USO DI UN PASSWORD ENCODER SICURO IN PRODUZIONE, AD ESEMPIO:
        // return new BCryptPasswordEncoder();
        return NoOpPasswordEncoder.getInstance();
    }
}
