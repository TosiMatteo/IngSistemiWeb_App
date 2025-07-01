package com.example.ingsistemiweb_app.repository;

import com.example.ingsistemiweb_app.model.Aula;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AulaRepository extends JpaRepository<Aula, Long> {
    List<Aula> findByAttivaTrue();
}
