package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.SlotDisponibilita;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import com.example.ingsistemiweb_app.model.Aula;
import com.example.ingsistemiweb_app.model.Prenotazione; // Importa Prenotazione
import com.example.ingsistemiweb_app.model.User; // Importa User
import com.example.ingsistemiweb_app.repository.AulaRepository;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository; // Importa PrenotazioneRepository
import com.example.ingsistemiweb_app.service.EmailSenderService; // Importa EmailSenderService
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional; // Importa Transactional
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime; // Importa LocalDateTime
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/aule")
public class AulaRestController {

    @Autowired
    private AulaRepository aulaRepository;

    @Autowired // Inietta PrenotazioneRepository
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired // Inietta EmailSenderService
    private EmailSenderService emailSenderService;

    @GetMapping
    public List<Aula> getAllAule() {
        return aulaRepository.findAll();
    }

    @GetMapping("/aule/attive")
    public List<Aula> getAllAuleAttive() {
        return aulaRepository.findByAttivaTrue();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Aula> getAula(@PathVariable Long id) {
        return aulaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @Transactional // Aggiungi @Transactional per assicurare l'atomicità delle operazioni
    public ResponseEntity<String> updateAula(@PathVariable Long id, @RequestBody Aula updatedAula) {
        return aulaRepository.findById(id).map(aula -> {
            // Controlla se l'aula sta per essere disattivata
            boolean wasActive = aula.isAttiva();
            boolean willBeInactive = !updatedAula.isAttiva();

            // Aggiorna i campi dell'aula
            aula.setNome(updatedAula.getNome());
            aula.setCapienza(updatedAula.getCapienza());
            aula.setRisorse(updatedAula.getRisorse());
            aula.setAttiva(updatedAula.isAttiva()); // Imposta il nuovo stato

            aulaRepository.save(aula); // Salva l'aula aggiornata

            // Se l'aula è stata disattivata, termina le prenotazioni attive e invia le email
            if (wasActive && willBeInactive) {
                List<Prenotazione> prenotazioniDaTerminare = prenotazioneRepository.findByAulaAndAttivaTrue(aula);

                for (Prenotazione prenotazione : prenotazioniDaTerminare) {
                    prenotazione.setAttiva(false); // Termina la prenotazione
                    // Puoi impostare la data di fine della prenotazione all'ora corrente
                    prenotazione.setFine(LocalDateTime.now());
                    prenotazioneRepository.save(prenotazione); // Salva la prenotazione terminata

                    // Invia email all'utente
                    User utente = prenotazione.getUtente();
                    if (utente != null) {
                        String destinatario = utente.getEmail();
                        String oggetto = "Avviso: Prenotazione Terminata - Aula Disattivata";
                        String testo = String.format(
                                """
                                        Gentile %s,
                                        
                                        La informiamo che la sua prenotazione dell'aula '%s' per il giorno %s dalle %s alle %s è stata terminata.
                                        Questo è dovuto alla disattivazione dell'aula.
                                        
                                        Ci scusiamo per il disagio.
                                        
                                        Cordiali saluti,
                                        Il team di Gestione Aule""",
                                utente.getNome(),
                                aula.getNome(),
                                prenotazione.getInizio().toLocalDate(),
                                prenotazione.getInizio().toLocalTime(),
                                prenotazione.getFine().toLocalTime()
                        );
                        emailSenderService.sendEmail(destinatario, oggetto, testo);
                        System.out.println("Email di avviso inviata a " + destinatario + " per prenotazione aula " + aula.getNome() + " terminata.");
                    }
                }
            }
            return ResponseEntity.ok("Aula aggiornata!");
        }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body("Errore: Aula non trovata."));
    }

    /**
     * Recupera la disponibilità di un'aula per una specifica data, suddividendola in slot di 30 minuti.
     * Mappa le richieste GET a "/api/aule/{id}/disponibilita".
     *
     * @param id L'ID dell'aula per cui verificare la disponibilità.
     * @param data La data di interesse nel formato stringa ISO (YYYY-MM-DD).
     * @return `ResponseEntity<List<SlotDisponibilita>>` contenente una lista di slot orari,
     * ciascuno con l'intervallo di tempo e il numero di posti disponibili.
     */
    @GetMapping("/{id}/disponibilita") // Mappa le richieste GET per la disponibilità dell'aula.
    public ResponseEntity<List<SlotDisponibilita>> getDisponibilita(
            @PathVariable Long id, // ID dell'aula.
            @RequestParam String data) { // Data come stringa.

        // Trova l'aula per ID, lancia un'eccezione se non trovata.
        Aula aula = aulaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Aula non trovata"));

        // Parsifica la data e definisce gli orari di apertura/chiusura dell'aula per la giornata.
        LocalDate localDate = LocalDate.parse(data);
        ZoneId zona = ZoneId.of("Europe/Rome"); // Fuso orario per i calcoli.
        LocalDateTime start = localDate.atTime(8, 0); // Orario di apertura (08:00).
        LocalDateTime end = localDate.atTime(20, 0);  // Orario di chiusura (20:00).

        List<SlotDisponibilita> slots = new ArrayList<>(); // Lista per memorizzare gli slot disponibili.
        LocalDateTime cursor = start; // Cursore per iterare sugli slot di tempo.

        // Genera slot di 30 minuti per tutta la giornata lavorativa dell'aula.
        while (cursor.isBefore(end)) {
            LocalDateTime slotEnd = cursor.plusMinutes(30); // Fine dello slot corrente.
            // Conta le prenotazioni esistenti che si sovrappongono a questo slot.
            long occupati = prenotazioneRepository.sumPostiOverlapping(aula, cursor, slotEnd);
            slots.add(new SlotDisponibilita(
                    cursor.atZone(zona).toOffsetDateTime().toString(), // Inizio slot (formato ISO con offset).
                    slotEnd.atZone(zona).toOffsetDateTime().toString(),  // Fine slot (formato ISO con offset).
                    aula.getCapienza() - (int) occupati // Posti disponibili = Capienza - Posti occupati.
            ));
            cursor = slotEnd; // Sposta il cursore al prossimo slot.
        }
        return ResponseEntity.ok(slots); // Restituisce la lista degli slot di disponibilità.
    }

    /**
     * Restituisce il numero di posti attualmente occupati in una specifica aula.
     * Mappa le richieste GET a "/api/aule/{id}/posti-occupati".
     * I posti occupati vengono calcolati per l'ora corrente.
     *
     * @param id L'ID dell'aula per cui verificare i posti occupati.
     * @return `ResponseEntity<Integer>` contenente il numero di posti occupati.
     */
    @GetMapping("/{id}/posti-occupati")
    public ResponseEntity<Integer> getPostiOccupati(@PathVariable Long id) {
        // Trova l'aula per ID, restituisce 404 se non trovata.
        Optional<Aula> optionalAula = aulaRepository.findById(id);
        if (optionalAula.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Aula aula = optionalAula.get();

        // Ottieni l'ora corrente
        LocalDateTime now = LocalDateTime.now();

        // Calcola i posti occupati che si sovrappongono all'ora corrente
        // Questo metodo `sumPostiOverlapping` è già presente nella tua PrenotazioneRepository
        long occupati = prenotazioneRepository.sumPostiOverlapping(aula, now, now.plusMinutes(1)); // Consideriamo un piccolo intervallo per "ora corrente"

        return ResponseEntity.ok((int) occupati);
    }

}
