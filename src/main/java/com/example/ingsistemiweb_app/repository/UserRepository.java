package com.example.ingsistemiweb_app.repository;

import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.model.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository per l'accesso e la gestione dei dati degli utenti.
 * Fornisce metodi per cercare, filtrare e recuperare utenti dal database.
 * Estende JpaRepository per ereditare le operazioni CRUD di base.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * Trova un utente tramite il suo indirizzo email.
     * 
     * @param email L'indirizzo email dell'utente da cercare.
     * @return Un Optional contenente l'utente se trovato, altrimenti vuoto.
     */
    Optional<User> findByEmail(String email);

    /**
     * Trova tutti gli utenti che hanno uno dei ruoli specificati nella lista.
     * 
     * @param professore Lista di ruoli utente da cercare.
     * @return Lista di utenti che hanno uno dei ruoli specificati.
     */
    List<User> findByRuoloIn(List<UserRole> professore);

    /**
     * Cerca utenti in base al ruolo e a un termine di ricerca, con supporto per la paginazione.
     * La ricerca viene effettuata su nome, cognome ed email dell'utente.
     * 
     * @param ruolo Il ruolo dell'utente da cercare (può essere null per cercare tutti i ruoli).
     * @param searchTerm Il termine di ricerca da utilizzare (può essere null o vuoto).
     * @param pageable Oggetto Pageable per gestire la paginazione dei risultati.
     * @return Una Page contenente gli utenti che corrispondono ai criteri di ricerca.
     */
    @Query("SELECT u FROM User u WHERE " +
            "(:ruolo IS NULL OR u.ruolo = :ruolo) AND " +
            "(:searchTerm IS NULL OR " +
            " u.nome LIKE CONCAT('%', :searchTerm, '%') OR " +
            " u.cognome LIKE CONCAT('%', :searchTerm, '%') OR " +
            " u.email LIKE CONCAT('%', :searchTerm, '%'))")
    Page<User> findByRuoloAndSearchTerm(
            @Param("ruolo") UserRole ruolo,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );
}
