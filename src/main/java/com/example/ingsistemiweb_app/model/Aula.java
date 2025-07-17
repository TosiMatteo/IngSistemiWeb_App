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
    private List<String> risorse = new ArrayList<>();
    private boolean attiva = true;
    private String imageUrl;

    public String getRisorseString() {
        if (risorse == null || risorse.isEmpty()) return "";
        return String.join(", ", risorse);
    }

}