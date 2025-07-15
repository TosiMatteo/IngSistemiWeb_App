package com.example.ingsistemiweb_app.service;

import com.example.ingsistemiweb_app.dto.AdminUserUpdateDTO;
import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.model.UserRole;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository;
import com.example.ingsistemiweb_app.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Servizio di business logic per le operazioni di amministrazione sugli utenti.
 */
@Service
public class AdminUserService {

    // Dipendenze
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailSenderService emailSenderService;

    /**
     * Trova utenti con filtri per ruolo e termine di ricerca.
     */
    public Page<User> findUsers(String ruoloFilter, String searchTerm, Pageable pageable) {
        UserRole ruolo = null;
        if (ruoloFilter != null && !ruoloFilter.equalsIgnoreCase("tutti")) {
            try {
                ruolo = UserRole.valueOf(ruoloFilter.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Ignora il filtro se il ruolo non è valido
            }
        }
        return userRepository.findByRuoloAndSearchTerm(ruolo, searchTerm, pageable);
    }

    /**
     * Aggiorna i dati di un utente, con una protezione per gli account admin.
     */
    @Transactional
    public User updateUser(Long userId, AdminUserUpdateDTO userData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utente non trovato con ID: " + userId));

        // REGOLA DI SICUREZZA: Impedisce la modifica di altri admin da questa interfaccia.
        if (user.getRuolo() == UserRole.AMMINISTRATORE) {
            throw new IllegalArgumentException("Gli account amministratore non possono essere modificati da questa interfaccia.");
        }

        // Aggiorna i campi
        user.setNome(userData.getNome());
        user.setCognome(userData.getCognome());
        user.setEmail(userData.getEmail());

        // Aggiorna la password solo se ne viene fornita una nuova
        if (userData.getPassword() != null && !userData.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userData.getPassword()));
        }

        User updatedUser = userRepository.save(user);

        // Invia email di notifica
        String subject = "Il tuo account è stato aggiornato";
        String text = String.format(
                """
                        Ciao %s,
                        
                        Ti informiamo che un amministratore ha aggiornato i dati del tuo account sulla nostra piattaforma.
                        
                        Se non ti aspettavi questa modifica, contatta il supporto.""",
                user.getNome()
        );
        emailSenderService.sendEmail(user.getEmail(), subject, text);

        return updatedUser;
    }

    /**
     * Elimina un utente, annullando prima le sue prenotazioni attive per mantenere la coerenza dei dati.
     */
    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utente non trovato con ID: " + userId));

        // REGOLA DI SICUREZZA: Impedisce l'eliminazione di un account admin.
        if (user.getRuolo() == UserRole.AMMINISTRATORE) {
            throw new IllegalArgumentException("Un account amministratore non può essere eliminato.");
        }

        // AZIONE PRELIMINARE: Elimina tutte le prenotazioni associate all'utente.
        prenotazioneRepository.deleteByUtente(user);

        // Eliminazione
        userRepository.delete(user);

        // Invia email di notifica
        String subject = "Il tuo account è stato eliminato";
        String text = String.format(
                "Ciao %s,\n\nTi informiamo che il tuo account sulla nostra piattaforma è stato eliminato da un amministratore.",
                user.getNome()
        );
        emailSenderService.sendEmail(user.getEmail(), subject, text);
    }
}
