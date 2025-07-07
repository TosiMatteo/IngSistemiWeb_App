package com.example.ingsistemiweb_app.model;

import jakarta.persistence.*;
import lombok.Data;

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
    @ElementCollection
    private List<String> risorse = new ArrayList<>();
    private boolean attiva = true;
    private String imageUrl;

    public String getRisorseString() {
        if (risorse == null || risorse.isEmpty()) return "";
        return String.join(", ", risorse);
    }

}