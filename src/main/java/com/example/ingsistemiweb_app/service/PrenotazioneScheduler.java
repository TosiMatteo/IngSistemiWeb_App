package com.example.ingsistemiweb_app.service;

import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.logging.Logger;

@Component
public class PrenotazioneScheduler {

    private static final Logger LOGGER = Logger.getLogger(PrenotazioneScheduler.class.getName());
    private final ZoneId zonaItalia = ZoneId.of("Europe/Rome");

    @Autowired
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired
    private PrenotazioneService prenotazioneService;

    /**
     * Questo metodo viene eseguito ogni minuto.
     * Cerca le prenotazioni degli studenti per cui la finestra di check-in è scaduta
     * e le termina automaticamente.
     */
    @Scheduled(fixedRate = 60000) // 60000 ms = 1 minuto
    public void annullaPrenotazioniSenzaCheckIn() {
        LOGGER.info("Esecuzione task: controllo prenotazioni senza check-in...");

        // Cerca prenotazioni iniziate da più di 15 minuti che non hanno fatto il check-in
        LocalDateTime cutoffTime = LocalDateTime.now(zonaItalia).minusMinutes(15);

        List<Prenotazione> prenotazioniDaAnnullare = prenotazioneRepository.findStudentBookingsToCheckIn(cutoffTime);

        if (prenotazioniDaAnnullare.isEmpty()) {
            LOGGER.info("Nessuna prenotazione da annullare per mancato check-in.");
            return;
        }

        LOGGER.info(String.format("Trovate %d prenotazioni da annullare per mancato check-in.", prenotazioniDaAnnullare.size()));

        for (Prenotazione p : prenotazioniDaAnnullare) {
            try {
                // Riusa la logica di terminazione esistente!
                prenotazioneService.terminaPrenotazione(p.getId(), p.getUtente().getEmail());
                LOGGER.info(String.format("Prenotazione ID %d annullata per mancato check-in.", p.getId()));
            } catch (Exception e) {
                LOGGER.severe(String.format("Errore durante l'annullamento della prenotazione ID %d: %s", p.getId(), e.getMessage()));
            }
        }
    }
}