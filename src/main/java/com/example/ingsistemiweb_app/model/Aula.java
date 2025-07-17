package com.example.ingsistemiweb_app.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class Aula {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private int capienza;
    private LocalTime orarioApertura = LocalTime.of(8, 0);
    private LocalTime orarioChiusura = LocalTime.of(20, 0);
    @ElementCollection
    private List<String> risorse = new ArrayList<>(); // Lista delle risorse disponibili nell'aula
    private boolean attiva = true;
    private String imageUrl;

    /**
     * Metodo helper per ottenere le risorse dell'aula come una singola stringa,
     * separate da una virgola e uno spazio. Utile per la visualizzazione nella UI.
     * @return Una stringa contenente tutte le risorse dell'aula, o una stringa vuota se non ci sono risorse.
     */
    public String getRisorseString() {
        // Se la lista di risorse è nulla o vuota, restituisce una stringa vuota.
        if (risorse == null || risorse.isEmpty()) return "";
        // Unisce gli elementi della lista in una singola stringa usando ", " come separatore.
        return String.join(", ", risorse);
    }

}