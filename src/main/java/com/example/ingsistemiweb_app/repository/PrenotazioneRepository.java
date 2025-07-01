package com.example.ingsistemiweb_app.repository;

import com.example.ingsistemiweb_app.model.Aula;
import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PrenotazioneRepository extends JpaRepository<Prenotazione, Long> {

    /**
     * Somma il numero di posti prenotati in tutte le prenotazioni attive
     * che si sovrappongono all’intervallo [inizio, fine].
     * Se non ci sono righe, restituisce 0.
     */
    @Query("SELECT COALESCE(SUM(p.numeroPostiPrenotati), 0) " +
            "FROM Prenotazione p " +
            "WHERE p.aula = :aula " +
            "  AND p.attiva = true " +
            "  AND ( (p.inizio BETWEEN :inizio AND :fine) " +
            "     OR (p.fine   BETWEEN :inizio AND :fine) " +
            "     OR (p.inizio <= :inizio AND p.fine >= :fine) )")
    long sumPostiOverlapping(
            @Param("aula") Aula aula,
            @Param("inizio") LocalDateTime inizio,
            @Param("fine") LocalDateTime fine
    );

    // METODO PER IL TASK SCHEDULATO
    @Query("SELECT p FROM Prenotazione p WHERE p.attiva = true AND p.checkedIn = false AND p.utente.ruolo = 'STUDENTE' AND p.inizio < :cutoffTime")
    List<Prenotazione> findStudentBookingsToCheckIn(@Param("cutoffTime") LocalDateTime cutoffTime);

    // Trova tutte le prenotazioni di un'aula in un giorno specifico
    List<Prenotazione> findByAulaIdAndInizioBetween(Long aulaId, LocalDateTime startOfDay, LocalDateTime endOfDay);

    List<Prenotazione> findByUtenteEmail(String name);

    List<Prenotazione> findByUtenteEmailAndAttivaTrue(String name);

    List<Prenotazione> findByAulaAndAttivaTrue(Aula aula);

    Page<Prenotazione> findByUtenteAndAttiva(User utente, boolean attiva, Pageable pageable);

    List<Prenotazione> findByUtenteAndAttiva(User utente, boolean attiva);

    Page<Prenotazione> findByUtente(User utente, Pageable pageable);

}
