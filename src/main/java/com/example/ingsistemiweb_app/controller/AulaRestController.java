package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.dto.SlotDisponibilita;
import com.example.ingsistemiweb_app.service.FileStorageService;
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
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime; // Importa LocalDateTime
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Controller REST per la gestione delle aule.
 * Fornisce endpoint per la creazione, visualizzazione, aggiornamento e gestione
 * delle aule e delle loro disponibilità nel sistema di prenotazione.
 * Mappa le richieste su "/api/aule".
 */
@RestController
@RequestMapping("/api/aule")
public class AulaRestController {

    /**
     * Repository per l'accesso ai dati delle aule.
     * Consente operazioni CRUD sulle entità Aula.
     */
    @Autowired
    private AulaRepository aulaRepository;

    /**
     * Repository per l'accesso ai dati delle prenotazioni.
     * Utilizzato per gestire le prenotazioni associate alle aule.
     */
    @Autowired
    private PrenotazioneRepository prenotazioneRepository;

    /**
     * Servizio per l'invio di email agli utenti.
     * Utilizzato per notificare cambiamenti nelle prenotazioni.
     */
    @Autowired
    private EmailSenderService emailSenderService;

    /**
     * Servizio per la gestione dello storage dei file.
     * Utilizzato per salvare le immagini delle aule.
     */
    @Autowired
    private FileStorageService fileStorageService;

    /**
     * Recupera tutte le aule presenti nel sistema.
     * Mappa le richieste GET a "/api/aule".
     *
     * @return Lista contenente tutte le aule disponibili nel sistema.
     */
    @GetMapping
    public List<Aula> getAllAule() {
        return aulaRepository.findAll();
    }

    /**
     * Recupera tutte le aule attualmente attive nel sistema.
     * Mappa le richieste GET a "/api/aule/aule/attive".
     *
     * @return Lista contenente solo le aule attive (con il flag attiva = true).
     */
    @GetMapping("/aule/attive")
    public List<Aula> getAllAuleAttive() {
        return aulaRepository.findByAttivaTrue();
    }

    /**
     * Recupera una specifica aula tramite il suo ID.
     * Mappa le richieste GET a "/api/aule/{id}".
     *
     * @param id L'identificativo dell'aula da recuperare.
     * @return ResponseEntity contenente l'aula se trovata, o status 404 se non trovata.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Aula> getAula(@PathVariable Long id) {
        return aulaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Aggiorna una specifica aula identificata dall'ID.
     * Mappa le richieste PUT a "/api/aule/{id}".
     * Se l'aula viene disattivata, termina automaticamente tutte le prenotazioni attive
     * e invia email di notifica agli utenti interessati.
     * 
     * @param id L'identificativo dell'aula da aggiornare.
     * @param updatedAula L'oggetto Aula con i dati aggiornati.
     * @return ResponseEntity con messaggio di conferma o errore.
     */
    @PutMapping("/{id}")
    @Transactional // Assicura l'atomicità delle operazioni in caso di più aggiornamenti al database
    public ResponseEntity<String> updateAula(@PathVariable Long id, @RequestBody Aula updatedAula) {
        return aulaRepository.findById(id).map(aula -> {
            // Controlla se l'aula sta per essere disattivata confrontando lo stato attuale con quello richiesto
            boolean wasActive = aula.isAttiva();         // Stato attuale: attiva?
            boolean willBeInactive = !updatedAula.isAttiva(); // Stato futuro: sarà disattivata?

            // Aggiorna tutti i campi dell'aula con i valori forniti nella richiesta
            aula.setNome(updatedAula.getNome());          // Aggiorna il nome
            aula.setCapienza(updatedAula.getCapienza());   // Aggiorna la capienza
            aula.setRisorse(updatedAula.getRisorse());     // Aggiorna la lista delle risorse disponibili
            aula.setAttiva(updatedAula.isAttiva());        // Aggiorna lo stato di attivazione

            aulaRepository.save(aula); // Persiste le modifiche nel database

            // Se l'aula passa da stato attivo a inattivo, gestisci le prenotazioni esistenti
            if (wasActive && willBeInactive) {
                // Recupera tutte le prenotazioni attive associate all'aula
                List<Prenotazione> prenotazioniDaTerminare = prenotazioneRepository.findByAulaAndAttivaTrue(aula);

                // Processa ogni prenotazione attiva
                for (Prenotazione prenotazione : prenotazioniDaTerminare) {
                    prenotazione.setAttiva(false);             // Marca la prenotazione come non più attiva
                    prenotazione.setFine(LocalDateTime.now()); // Imposta la fine della prenotazione all'istante corrente
                    prenotazioneRepository.save(prenotazione);  // Persiste le modifiche alla prenotazione

                    // Prepara e invia un'email di notifica all'utente della prenotazione
                    User utente = prenotazione.getUtente();
                    if (utente != null) {
                        // Prepara i dettagli dell'email
                        String destinatario = utente.getEmail();  // Indirizzo email dell'utente
                        String oggetto = "Avviso: Prenotazione Terminata - Aula Disattivata"; // Oggetto dell'email
                        // Corpo dell'email formattato con i dettagli della prenotazione
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

    /**
     * Crea una nuova aula con possibilità di allegare un'immagine.
     * Mappa richieste POST di tipo multipart/form-data a "/api/aule".
     * 
     * @param nome Nome dell'aula da creare.
     * @param capienza Numero massimo di posti disponibili nell'aula.
     * @param risorse Elenco di risorse dell'aula, fornite come stringa separata da virgole.
     * @param attiva Flag che indica se l'aula è attiva e disponibile per prenotazioni.
     * @param immagineFile File immagine opzionale che rappresenta l'aula.
     * @return ResponseEntity contenente l'aula creata e lo status HTTP 201 (Created).
     */
    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<Aula> createAulaWithImage(
            @RequestParam("nome") String nome,
            @RequestParam("capienza") int capienza,
            @RequestParam("risorse") String risorse,
            @RequestParam("attiva") boolean attiva,
            @RequestParam(value = "immagineFile", required = false) MultipartFile immagineFile) {

        // Crea una nuova istanza dell'entità Aula
        Aula newAula = new Aula();
        newAula.setNome(nome);                                     // Imposta il nome dell'aula
        newAula.setCapienza(capienza);                             // Imposta la capienza massima
        newAula.setRisorse(java.util.Arrays.asList(risorse.split(","))); // Converte la stringa risorse in lista
        newAula.setAttiva(attiva);                                // Imposta lo stato di attivazione

        // Gestione dell'immagine dell'aula (opzionale)
        if (immagineFile != null && !immagineFile.isEmpty()) {
            String imageUrl = fileStorageService.save(immagineFile); // Salva l'immagine e ottieni l'URL
            newAula.setImageUrl(imageUrl);                         // Associa l'URL dell'immagine all'aula
        }

        // Persiste l'aula nel database
        Aula savedAula = aulaRepository.save(newAula);
        // Restituisce l'aula creata con status 201 (Created)
        return new ResponseEntity<>(savedAula, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Object> deleteAula(@PathVariable Long id) {
        return aulaRepository.findById(id).map(aula -> {

            // Prima di eliminare l'aula, recupera il percorso dell'immagine
            String imageUrlToDelete = aula.getImageUrl();

            // 1. Elimina le prenotazioni associate
            List<Prenotazione> prenotazioniAssociate = prenotazioneRepository.findByAula(aula);
            prenotazioneRepository.deleteAll(prenotazioniAssociate);

            // 2. Elimina l'aula dal database
            aulaRepository.delete(aula);

            // 3. Elimina il file immagine associato dal disco del server
            fileStorageService.delete(imageUrlToDelete);

            // Restituisce 204 No Content per indicare che l'operazione è riuscita ma non c'è corpo da restituire.
            return ResponseEntity.noContent().build();

        }).orElse(ResponseEntity.notFound().build());
    }

}
