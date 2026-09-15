package com.example.ingsistemiweb_app.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.NoOpPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;

/**
 * Configurazione principale della sicurezza dell'applicazione Spring Security.
 * Questa classe definisce le regole di accesso (autorizzazione), la gestione del form di login,
 * del logout e la gestione delle eccezioni di autenticazione.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Gestore personalizzato per il reindirizzamento dopo un login di successo.
     */
    @Autowired
    private CustomAuthenticationSuccessHandler successHandler;

    /**
     * Configura la catena di filtri di sicurezza per le richieste HTTP.
     *
     * @param http L'oggetto HttpSecurity per la configurazione.
     * @return La catena di filtri di sicurezza configurata.
     * @throws Exception Se la configurazione fallisce.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        // --- 1. Endpoint e Risorse Pubbliche ---
                        // Permette l'accesso a tutti a risorse statiche (CSS, JS, immagini),
                        // e alle pagine di login e registrazione.
                        .requestMatchers(
                                "/", "/login", "/registrazione", "/index",
                                "/css/**", "/javascript/**", "/images/**", "/uploads/**"
                        ).permitAll()
                        // Permette l'accesso pubblico a specifiche API (es. per la disponibilità aule)
                        .requestMatchers("/api/aule/*/posti-occupati").permitAll()
                        .requestMatchers("/api/annunci/attivi").permitAll()

                        // --- 2. Endpoint Protetti per Ruolo ---
                        // Le regole più specifiche vanno prima di quelle più generali.
                        // Accesso solo per gli AMMINISTRATORI
                        // (/send-email e' riservato agli admin per evitare che venga usato come relay di spam)
                        .requestMatchers("/admin/**", "/amministratoreDashboard", "/api/admin/**", "/api/annunci/**", "/send-email").hasRole("AMMINISTRATORE")
                        // Creazione, modifica ed eliminazione delle aule
                        .requestMatchers(HttpMethod.POST, "/api/aule", "/api/aule/**").hasRole("AMMINISTRATORE")
                        .requestMatchers(HttpMethod.PUT, "/api/aule/**").hasRole("AMMINISTRATORE")
                        .requestMatchers(HttpMethod.DELETE, "/api/aule/**").hasRole("AMMINISTRATORE")
                        // Accesso solo per i PROFESSORI
                        .requestMatchers("/professore/**", "/professoreDashboard", "/api/professore/**").hasRole("PROFESSORE")
                        // Accesso solo per gli STUDENTI
                        .requestMatchers("/studente/**", "/api/studente/**").hasRole("STUDENTE")

                        // --- 3. Endpoint Protetti con Autenticazione (qualsiasi ruolo) ---
                        // Consente a qualsiasi utente autenticato di visualizzare la disponibilità delle aule.
                        .requestMatchers(HttpMethod.GET, "/api/aule/*/disponibilita").authenticated()

                        // --- 4. Regola Catch-All (Default) ---
                        // Qualsiasi altra richiesta non specificata sopra richiede l'autenticazione.
                        .anyRequest().authenticated()
                )
                // --- Configurazione del Form di Login ---
                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .successHandler(successHandler)
                        .failureUrl("/login?error=true")
                        .permitAll()
                )
                // --- Configurazione del Logout ---
                .logout(logout -> logout
                        .logoutSuccessUrl("/login?logout=true")
                        .permitAll()
                )
                // --- Gestione delle Eccezioni ---
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login"))
                )
        ;

        return http.build();
    }

    /**
     * Bean per la gestione dell'encoder delle password.
     * Le nuove password vengono salvate con BCrypt (prefisso "{bcrypt}").
     * Per compatibilita' con database creati dalle versioni precedenti, le password
     * salvate in chiaro (senza prefisso) vengono ancora riconosciute al login.
     */
    @Bean
    @SuppressWarnings("deprecation")
    public PasswordEncoder passwordEncoder() {
        DelegatingPasswordEncoder encoder =
                (DelegatingPasswordEncoder) PasswordEncoderFactories.createDelegatingPasswordEncoder();
        encoder.setDefaultPasswordEncoderForMatches(NoOpPasswordEncoder.getInstance());
        return encoder;
    }
}
