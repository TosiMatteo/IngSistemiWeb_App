package com.example.ingsistemiweb_app.service;


import com.example.ingsistemiweb_app.dto.PrenotazioneRequest;
import com.example.ingsistemiweb_app.model.Aula;
import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.model.UserRole;
import com.example.ingsistemiweb_app.repository.AulaRepository;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository;
import com.example.ingsistemiweb_app.repository.UserRepository;
import com.example.ingsistemiweb_app.dto.PrenotazioneType; // Importa il nuovo enum
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class PrenotazioneService {

    private final UserRepository userRepository;
    private final AulaRepository aulaRepository;
    private final PrenotazioneRepository prenotazioneRepository;
    private final EmailSenderService emailSenderService;
    private final ZoneId zonaItalia = ZoneId.of("Europe/Rome");


    @Autowired
    public PrenotazioneService(UserRepository userRepository,
                                       AulaRepository aulaRepository,
                                       PrenotazioneRepository prenotazioneRepository,
                                       EmailSenderService emailSenderService) {
        this.userRepository = userRepository;
        this.aulaRepository = aulaRepository;
        this.prenotazioneRepository = prenotazioneRepository;
        this.emailSenderService = emailSenderService;
    }

    /**
     * Termina una prenotazione, convalidando i permessi dell'utente che effettua la richiesta.
     * Un utente può terminare solo le proprie prenotazioni. Un ADMIN può terminare qualsiasi prenotazione.
     *
     * @param prenotazioneId L'ID della prenotazione da terminare.
     * @param userEmail L'email dell'utente che sta effettuando la richiesta (Studente, Professore o Admin).
     * @return Il messaggio di successo.
     * @throws RuntimeException se la prenotazione non esiste.
     * @throws IllegalArgumentException se l'utente non ha i permessi per terminare la prenotazione
     * o se la prenotazione non è attiva.
     * @throws UsernameNotFoundException se l'utente non viene trovato.
     */
    @Transactional
    public String terminaPrenotazione(Long prenotazioneId, String userEmail) {
        // 1. Trova la prenotazione
        Prenotazione prenotazione = prenotazioneRepository.findById(prenotazioneId)
                .orElseThrow(() -> new RuntimeException("Prenotazione non trovata con ID: " + prenotazioneId));

        // 2. Trova l'utente che sta effettuando l'azione
        User requestingUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato con email: " + userEmail));

        // 3. Validazioni dei permessi
        // Un utente (studente/professore) può terminare solo le proprie prenotazioni.
        // Un AMMINISTRATORE può terminare qualsiasi prenotazione.
        if (!requestingUser.getRuolo().equals(UserRole.AMMINISTRATORE) &&
                !prenotazione.getUtente().getId().equals(requestingUser.getId())) {
            throw new IllegalArgumentException("Non hai i permessi per terminare questa prenotazione.");
        }

        // Verifica che la prenotazione sia ancora attiva
        if (!prenotazione.isAttiva()) {
            throw new IllegalArgumentException("Questa prenotazione non è più attiva e non può essere terminata.");
        }

        // 4. Esegui la logica di business: termina la prenotazione
        prenotazione.setAttiva(false);
        prenotazioneRepository.save(prenotazione);

        // 5. Invia l'email di conferma all'utente proprietario della prenotazione
        User owner = prenotazione.getUtente(); // Ottieni l'utente proprietario della prenotazione
        String destinatario = owner.getEmail();
        String oggetto = "Conferma Annullamento Prenotazione Aula";

        // Costruisci un messaggio email dinamico in base al ruolo del proprietario
        String testoEmail = String.format("Ciao %s %s,\n\nLa tua prenotazione per l'aula %s il giorno %s dalle %s alle %s è stata annullata.\n\nI posti in quest'aula sono ora disponibili per nuove prenotazioni.",
                owner.getRuolo().name().equals("PROFESSORE") ? "Prof." : "", // Prefix per Professore
                owner.getNome(),
                prenotazione.getAula().getNome(),
                prenotazione.getInizio().toLocalDate(),
                prenotazione.getInizio().toLocalTime(),
                prenotazione.getFine().toLocalTime()
        );

        emailSenderService.sendEmail(destinatario, oggetto, testoEmail);
        System.out.println("Email di annullamento prenotazione inviata a " + destinatario);

        return "Prenotazione aula terminata con successo.";
    }

    @Transactional
    public String creaPrenotazione(PrenotazioneRequest request, String userEmail, PrenotazioneType type) {
        // 1. Recupero utente
        User utente = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato con email: " + userEmail));

        // 2. Recupero aula
        Aula aula = aulaRepository.findById(request.getAulaId())
                .orElseThrow(() -> new IllegalArgumentException("Aula non trovata.")); // Cambiato da RuntimeException a IllegalArgumentException

        // 3. Parsing e validazione date e orari comuni
        LocalDateTime inizio, fine;
        try {
            inizio = OffsetDateTime.parse(request.getInizio()).atZoneSameInstant(zonaItalia).toLocalDateTime();
            fine = OffsetDateTime.parse(request.getFine()).atZoneSameInstant(zonaItalia).toLocalDateTime();
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Formato data/ora non valido.");
        }

        if (!fine.isAfter(inizio)) {
            throw new IllegalArgumentException("L'orario di fine deve essere successivo all'orario di inizio.");
        }

        Duration durata = Duration.between(inizio, fine);
        if (durata.toHours() > 4 || (durata.toHours() == 4 && durata.toMinutesPart() > 0)) {
            throw new IllegalArgumentException("La durata massima consentita per una prenotazione è di 4 ore.");
        }

        // 4. Validazioni specifiche per tipo di prenotazione (Professore vs Studente)
        int postiDaPrenotare;
        if (type == PrenotazioneType.PROFESSORE_FULL_ROOM) {
            // Validazioni Professore
            if (utente.getRuolo() != UserRole.PROFESSORE) {
                throw new IllegalArgumentException("Accesso negato. Solo i professori possono prenotare intere aule.");
            }
            LocalDate oggi = LocalDate.now(zonaItalia);
            LocalDate dataInizioPrenotazione = inizio.toLocalDate();
            if (dataInizioPrenotazione.isBefore(oggi.plusDays(2)) || dataInizioPrenotazione.isAfter(oggi.plusDays(14))) {
                throw new IllegalArgumentException("Le prenotazioni professori devono essere effettuate con un preavviso tra 2 e 14 giorni.");
            }
            postiDaPrenotare = aula.getCapienza(); // Prenota l'intera aula
        } else if (type == PrenotazioneType.STUDENTE_SINGLE_SEAT) {
            // Validazioni Studente
            if (utente.getRuolo() != UserRole.STUDENTE) {
                throw new IllegalArgumentException("Accesso negato. Solo gli studenti possono prenotare singoli posti.");
            }
            if (!inizio.toLocalDate().equals(fine.toLocalDate())) {
                throw new IllegalArgumentException("Le prenotazioni studenti sono valide solo per la stessa giornata.");
            }
            if (inizio.getHour() < 8 || fine.getHour() > 20 || (fine.getHour() == 20 && fine.getMinute() > 0)) {
                throw new IllegalArgumentException("Le prenotazioni studenti sono consentite solo tra le 08:00 e le 20:00.");
            }
            postiDaPrenotare = 1; // Prenota un singolo posto
        } else {
            throw new IllegalArgumentException("Tipo di prenotazione non riconosciuto.");
        }

        // 5. Controllo disponibilità aula
        long postiAttualmenteOccupati = prenotazioneRepository.sumPostiOverlapping(aula, inizio, fine);
        if (postiAttualmenteOccupati + postiDaPrenotare > aula.getCapienza()) {
            throw new IllegalArgumentException("Aula non disponibile o non ci sono abbastanza posti liberi nell'orario selezionato.");
        }

        // 6. Verifica sovrapposizione con altre prenotazioni dello stesso utente
        List<Prenotazione> propriePrenotazioniAttive = prenotazioneRepository.findByUtenteEmailAndAttivaTrue(userEmail);
        boolean conflittoConPropriePrenotazioni = propriePrenotazioniAttive.stream()
                .anyMatch(p -> !(p.getFine().isBefore(inizio) || p.getInizio().isAfter(fine)));
        if (conflittoConPropriePrenotazioni) {
            throw new IllegalArgumentException("Hai già una prenotazione attiva che si sovrappone a questo orario.");
        }

        // 7. Creazione e salvataggio della prenotazione
        Prenotazione prenotazione = new Prenotazione();
        prenotazione.setUtente(utente);
        prenotazione.setAula(aula);
        prenotazione.setInizio(inizio);
        prenotazione.setFine(fine);
        prenotazione.setAttiva(true);
        prenotazione.setNumeroPostiPrenotati(postiDaPrenotare);

        prenotazioneRepository.save(prenotazione);

        // 8. Invio dell'email di conferma
        String destinatario = utente.getEmail();
        String oggetto = "Conferma Prenotazione Aula";
        String testo = String.format("Ciao %s %s,\n\nHai prenotato con successo l'aula %s il giorno %s dalle %s alle %s.\n\nGrazie.",
                utente.getRuolo().equals(UserRole.PROFESSORE) ? "Prof." : "",
                utente.getNome(),
                aula.getNome(),
                inizio.toLocalDate(),
                inizio.toLocalTime(),
                fine.toLocalTime()
        );

        emailSenderService.sendEmail(destinatario, oggetto, testo);
        System.out.println("Email di conferma inviata a " + destinatario);

        // 9. Restituisce il messaggio di successo con i posti rimanenti
        long nuoviOccupati = postiAttualmenteOccupati + postiDaPrenotare;
        return "Prenotazione effettuata, posti rimasti: " + (aula.getCapienza() - nuoviOccupati);
    }

    @Transactional
    public String effettuaCheckIn(Long prenotazioneId, String userEmail) {
        Prenotazione prenotazione = prenotazioneRepository.findById(prenotazioneId)
                .orElseThrow(() -> new RuntimeException("Prenotazione non trovata con ID: " + prenotazioneId));

        // Validazione: solo lo studente proprietario può fare il check-in
        if (!prenotazione.getUtente().getEmail().equals(userEmail)) {
            throw new IllegalArgumentException("Non hai i permessi per effettuare il check-in per questa prenotazione.");
        }

        // Validazione: deve essere una prenotazione studente
        if(prenotazione.getUtente().getRuolo() != UserRole.STUDENTE) {
            throw new IllegalArgumentException("Il check-in è disponibile solo per gli studenti.");
        }

        if (prenotazione.isCheckedIn()) {
            return "Check-in già effettuato per questa prenotazione.";
        }

        if (!prenotazione.isAttiva()) {
            throw new IllegalArgumentException("La prenotazione non è più attiva.");
        }

        // Validazione della finestra temporale per il check-in
        LocalDateTime now = LocalDateTime.now(zonaItalia);
        LocalDateTime inizioPrenotazione = prenotazione.getInizio();
        LocalDateTime fineFinestraCheckIn = inizioPrenotazione.plusMinutes(15);

        if (now.isBefore(inizioPrenotazione)) {
            throw new IllegalArgumentException("La finestra di check-in non è ancora aperta. Riprova all'inizio della prenotazione.");
        }

        if (now.isAfter(fineFinestraCheckIn)) {
            throw new IllegalArgumentException("La finestra di check-in di 15 minuti è scaduta.");
        }

        // Se tutte le validazioni passano, effettua il check-in
        prenotazione.setCheckedIn(true);
        prenotazioneRepository.save(prenotazione);

        return "Check-in effettuato con successo!";
    }

    public Page<Prenotazione> getPrenotazioniUtente(String userEmail, String stato, Pageable pageable) {
        User utente = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato"));

        return switch (stato.toLowerCase()) {
            case "attive" ->
                // Cerca solo prenotazioni con attiva = true
                    prenotazioneRepository.findByUtenteAndAttiva(utente, true, pageable);
            case "terminate" ->
                // Cerca solo prenotazioni con attiva = false
                    prenotazioneRepository.findByUtenteAndAttiva(utente, false, pageable);
            default ->
                // Cerca tutte le prenotazioni dell'utente
                    prenotazioneRepository.findByUtente(utente, pageable);
        };
    }
}
