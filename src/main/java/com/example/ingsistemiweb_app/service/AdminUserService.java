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

import java.util.List;

@Service
public class AdminUserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailSenderService emailSenderService;

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

    @Transactional
    public User updateUser(Long userId, AdminUserUpdateDTO userData) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utente non trovato con ID: " + userId));

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

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utente non trovato con ID: " + userId));

        if (user.getRuolo() == UserRole.AMMINISTRATORE) {
            throw new IllegalArgumentException("Un account amministratore non può essere eliminato.");
        }

        // Gestione delle dipendenze: annulla le prenotazioni attive dell'utente prima di eliminarlo
        prenotazioneRepository.findByUtenteAndAttiva(user, true).forEach(p -> {
            p.setAttiva(false);
            prenotazioneRepository.save(p);
        });

        // Potresti voler anonimizzare le prenotazioni passate invece di avere problemi di foreign key
        // Esempio: prenotazioneRepository.findByUtente(user).forEach(p -> p.setUtente(null));

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
