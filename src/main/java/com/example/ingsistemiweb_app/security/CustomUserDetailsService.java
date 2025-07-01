package com.example.ingsistemiweb_app.security;

import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.Collections;

/**
 * Servizio personalizzato per il caricamento dei dettagli dell'utente.
 * Implementa l'interfaccia `UserDetailsService` di Spring Security, che è il punto cruciale
 * per il recupero delle informazioni dell'utente durante il processo di autenticazione.
 */
@Service // Indica che questa classe è un servizio Spring e può essere iniettata.
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired // Inietta l'istanza di UserRepository per accedere ai dati degli utenti nel database.
    private UserRepository userRepository;

    /**
     * Carica i dettagli dell'utente basandosi sull'email fornita (che funge da username).
     * Questo metodo è chiamato da Spring Security durante il tentativo di login.
     * @param email L'email dell'utente da cercare (utilizzata come username).
     * @return UserDetails un oggetto contenente l'email, la password hashata e il/i ruolo/i dell'utente.
     * @throws UsernameNotFoundException Se nessun utente viene trovato con l'email specificata.
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Cerca l'utente nel repository (il database) tramite l'email.
        // `orElseThrow` lancia un'eccezione `UsernameNotFoundException` se l'utente non viene trovato,
        // che è il comportamento atteso da Spring Security in questo scenario.
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato con email: " + email));

        // Costruisce e restituisce un oggetto `org.springframework.security.core.userdetails.User`.
        // Questo oggetto è l'implementazione predefinita di `UserDetails` fornita da Spring Security.
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(), // L'email dell'utente, usata come "username" per Spring Security.
                user.getPassword(), // La password dell'utente (dovrebbe essere hashata nel database).
                // Converte il ruolo dell'utente (`Ruolo` enum) in una lista di `GrantedAuthority`.
                // Spring Security richiede che i ruoli siano prefissati con "ROLE_" (convenzione).
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_"+user.getRuolo().name()))
        );
    }
}