package com.example.ingsistemiweb_app.config;

import com.example.ingsistemiweb_app.model.Aula;
import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.model.UserRole;
import com.example.ingsistemiweb_app.repository.AulaRepository;
import com.example.ingsistemiweb_app.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * Popola il database con utenti e aule dimostrativi al primo avvio.
 * Viene eseguito solo se la tabella degli utenti e' vuota, quindi non tocca database esistenti.
 * Si disattiva impostando app.seed-demo-data=false (variabile d'ambiente SEED_DEMO_DATA=false).
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
public class DemoDataInitializer implements CommandLineRunner {

    private static final Logger LOGGER = Logger.getLogger(DemoDataInitializer.class.getName());

    private final UserRepository userRepository;
    private final AulaRepository aulaRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataInitializer(UserRepository userRepository,
                               AulaRepository aulaRepository,
                               PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.aulaRepository = aulaRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        LOGGER.info("Database vuoto: creazione dei dati dimostrativi...");

        creaUtente("admin@demo.it", "admin", "Anna", "Amministratrice", null, UserRole.AMMINISTRATORE);
        creaUtente("professore@demo.it", "professore", "Paolo", "Rossi", "Ingegneria dei Sistemi Web", UserRole.PROFESSORE);
        creaUtente("studente@demo.it", "studente", "Sara", "Bianchi", null, UserRole.STUDENTE);

        if (aulaRepository.count() == 0) {
            creaAula("Aula Studio A", 30, List.of("Wi-Fi", "Prese elettriche", "Proiettore"));
            creaAula("Aula Studio B", 20, List.of("Wi-Fi", "Lavagna"));
            creaAula("Biblioteca", 50, List.of("Wi-Fi", "Prese elettriche", "Silenzio"));
        }

        LOGGER.info("Dati dimostrativi creati.");
    }

    private void creaUtente(String email, String password, String nome, String cognome,
                            String insegnamento, UserRole ruolo) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNome(nome);
        user.setCognome(cognome);
        user.setInsegnamento(insegnamento);
        user.setRuolo(ruolo);
        userRepository.save(user);
    }

    private void creaAula(String nome, int capienza, List<String> risorse) {
        Aula aula = new Aula();
        aula.setNome(nome);
        aula.setCapienza(capienza);
        aula.setRisorse(new ArrayList<>(risorse));
        aula.setOrarioApertura(LocalTime.of(8, 0));
        aula.setOrarioChiusura(LocalTime.of(20, 0));
        aula.setAttiva(true);
        aulaRepository.save(aula);
    }
}
