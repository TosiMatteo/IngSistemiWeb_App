package com.example.ingsistemiweb_app.service;

import com.example.ingsistemiweb_app.model.Annuncio;
import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.model.UserRole;
import com.example.ingsistemiweb_app.repository.AnnuncioRepository;
import com.example.ingsistemiweb_app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AnnuncioService {

    @Autowired
    private AnnuncioRepository annuncioRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailSenderService emailSenderService;

    @Transactional
    public Annuncio creaAnnuncio(String titolo, String contenuto, String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Amministratore non trovato con email: " + adminEmail));

        if (admin.getRuolo() != UserRole.AMMINISTRATORE) {
            throw new IllegalArgumentException("Solo gli amministratori possono pubblicare annunci.");
        }

        Annuncio annuncio = new Annuncio();
        annuncio.setTitolo(titolo);
        annuncio.setContenuto(contenuto);
        annuncio.setDataPubblicazione(LocalDateTime.now());
        annuncio.setAttivo(true);
        annuncio.setAmministratore(admin);
        Annuncio savedAnnuncio = annuncioRepository.save(annuncio); // Salva l'annuncio

        // --- Logica per l'invio dell'email ---
        // 1. Recupera tutti i professori e studenti
        List<User> usersToNotify = userRepository.findByRuoloIn(List.of(UserRole.PROFESSORE, UserRole.STUDENTE));

        // 2. Estrai le loro email
        List<String> recipientEmails = usersToNotify.stream()
                .map(User::getEmail)
                .collect(Collectors.toList());

        // 3. Prepara oggetto e corpo dell'email
        String emailSubject = "Nuovo Annuncio: " + savedAnnuncio.getTitolo();
        String emailBody = String.format(
                "Gentile utente,\n\n" +
                        "È stato pubblicato un nuovo annuncio importante:\n\n" +
                        "Titolo: %s\n" +
                        "Contenuto:\n%s\n\n" + // Il contenuto va a capo
                        "Pubblicato da: %s %s il %s\n\n" +
                        "Per maggiori dettagli, accedi al sistema di gestione aule studio.",
                savedAnnuncio.getTitolo(),
                savedAnnuncio.getContenuto(),
                admin.getNome(),
                admin.getCognome(),
                savedAnnuncio.getDataPubblicazione().toLocalDate()
        );

        // 4. Invia l'email ai destinatari
        emailSenderService.sendEmail(recipientEmails, emailSubject, emailBody);
        // --- Fine logica email ---

        return savedAnnuncio;
    }

    @Transactional
    public Annuncio aggiornaAnnuncio(Long id, String titolo, String contenuto, boolean attivo, String adminEmail) {
        Annuncio annuncio = annuncioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Annuncio non trovato con ID: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Amministratore non trovato con email: " + adminEmail));

        // Assicurati che solo l'amministratore che ha creato l'annuncio o un altro admin possa modificarlo
        if (admin.getRuolo() != UserRole.AMMINISTRATORE || !annuncio.getAmministratore().equals(admin)) {
            // Puoi scegliere se permettere a qualsiasi admin di modificare annunci di altri admin o solo al creatore
            // Qui assumiamo che solo il creatore possa modificare, ma un altro admin può disattivare.
            // Per semplicità, permettiamo a qualsiasi admin di modificare qui per ora.
            if (admin.getRuolo() != UserRole.AMMINISTRATORE) {
                throw new IllegalArgumentException("Solo gli amministratori possono modificare annunci.");
            }
        }

        annuncio.setTitolo(titolo);
        annuncio.setContenuto(contenuto);
        annuncio.setAttivo(attivo);
        return annuncioRepository.save(annuncio);
    }

    @Transactional
    public void disattivaAnnuncio(Long id, String adminEmail) {
        Annuncio annuncio = annuncioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Annuncio non trovato con ID: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Amministratore non trovato con email: " + adminEmail));

        if (admin.getRuolo() != UserRole.AMMINISTRATORE || !annuncio.getAmministratore().equals(admin)) {
            throw new IllegalArgumentException("Solo gli amministratori possono disattivare annunci.");
        }

        annuncio.setAttivo(false);
        annuncioRepository.save(annuncio);
    }

    @Transactional(readOnly = true)
    public List<Annuncio> getAnnunciAttivi() {
        return annuncioRepository.findByAttivoTrueOrderByDataPubblicazioneDesc();
    }

    @Transactional(readOnly = true)
    public List<Annuncio> getAllAnnunciForAdmin(String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Amministratore non trovato con email: " + adminEmail));

        if (admin.getRuolo() != UserRole.AMMINISTRATORE) {
            throw new IllegalArgumentException("Solo gli amministratori possono vedere tutti gli annunci.");
        }
        return annuncioRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "dataPubblicazione"));
    }

    @Transactional(readOnly = true)
    public Optional<Annuncio> getAnnuncioById(Long id) {
        return annuncioRepository.findById(id);
    }

    // Metodo per eliminare un annuncio (opzionale, fai attenzione con le eliminazioni)
    @Transactional
    public void eliminaAnnuncio(Long id, String adminEmail) {
        Annuncio annuncio = annuncioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Annuncio non trovato con ID: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Amministratore non trovato con email: " + adminEmail));

        if (admin.getRuolo() != UserRole.AMMINISTRATORE) {
            throw new IllegalArgumentException("Solo gli amministratori possono eliminare annunci.");
        }
        annuncioRepository.delete(annuncio);
    }
}