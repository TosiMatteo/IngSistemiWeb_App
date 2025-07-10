package com.example.ingsistemiweb_app.repository;

import com.example.ingsistemiweb_app.model.Annuncio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnuncioRepository extends JpaRepository<Annuncio, Long> {
    // Trova tutti gli annunci attivi, ordinati per data di pubblicazione decrescente
    List<Annuncio> findByAttivoTrueOrderByDataPubblicazioneDesc();

}