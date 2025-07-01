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

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Trova un utente tramite email
    Optional<User> findByEmail(String email);

    List<User> findByRuoloIn(List<UserRole> professore);

    // NUOVO METODO PER RICERCA, FILTRO E PAGINAZIONE
    @Query("SELECT u FROM User u WHERE " +
            "(:ruolo IS NULL OR u.ruolo = :ruolo) AND " +
            "(:searchTerm IS NULL OR :searchTerm = '' OR " +
            " u.nome LIKE %:searchTerm% OR " +
            " u.cognome LIKE %:searchTerm% OR " +
            " u.email LIKE %:searchTerm%)")
    Page<User> findByRuoloAndSearchTerm(
            @Param("ruolo") UserRole ruolo,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );
}
