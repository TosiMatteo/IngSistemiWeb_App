package com.example.ingsistemiweb_app.controller;

import com.example.ingsistemiweb_app.model.Aula;
import com.example.ingsistemiweb_app.model.Prenotazione;
import com.example.ingsistemiweb_app.model.User;
import com.example.ingsistemiweb_app.model.UserRole;
import com.example.ingsistemiweb_app.repository.AulaRepository;
import com.example.ingsistemiweb_app.repository.PrenotazioneRepository;
import com.example.ingsistemiweb_app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal; // Utilizzato per ottenere l'utente autenticato
import java.time.LocalDateTime; // Utilizzato per la logica di scadenza delle prenotazioni
import java.util.List; // Utilizzato per collezioni di oggetti

/**
 * Controller principale per la gestione delle pagine web dell'applicazione.
 * Questo controller si occupa di servire le viste HTML (utilizzando Thymeleaf)
 * e di gestire la logica di business associata alla visualizzazione delle pagine,
 * come il recupero dei dati dal database e la gestione del form di registrazione.
 */
@Controller // Annota la classe come un controller Spring MVC, che gestisce le richieste web.
@RequestMapping("/") // Mappa tutte le richieste che iniziano con "/" a questo controller.
public class PageController {

    // Dipendenze iniettate automaticamente da Spring.
    // Queste repository forniscono metodi per interagire con il database per le rispettive entità.
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AulaRepository aulaRepository;

    @Autowired
    private PrenotazioneRepository prenotazioneRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Gestisce le richieste per la homepage o la pagina index.
     * Accessibile sia tramite "/" che "/index".
     *
     * @param model Modello di Spring UI per passare dati alla vista (Thymeleaf).
     * @return Il nome della vista ("index.html") da renderizzare.
     */
    @GetMapping({"", "index"}) // Mappa le richieste GET per la root e "/index".
    public String index(Model model) {
        // Recupera l'oggetto Authentication dal contesto di sicurezza di Spring.
        // Contiene i dettagli dell'utente attualmente autenticato.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        model.addAttribute("username", auth.getName()); // Aggiunge il nome utente al modello per la vista.

        // Recupera tutte le aule dal database.
        List<Aula> aule = aulaRepository.findAll();
        model.addAttribute("aule", aule); // Aggiunge la lista delle aule al modello.

        return "index"; // Restituisce il nome della vista Thymeleaf.
    }

    /**
     * Gestisce la richiesta per la dashboard dell'amministratore.
     * Richiede un ruolo di AMMINISTRATORE per l'accesso (configurato in Spring Security).
     *
     * @param model Modello per passare dati alla vista.
     * @return Il nome della vista ("admin/amministratoreDashboard.html") da renderizzare.
     */
    @GetMapping("amministratoreDashboard") // Mappa le richieste GET per "/amministratoreDashboard".
    public String amministratoreDashboard(Model model) {
        // Recupera tutte le aule, utili per la gestione e la visualizzazione nella dashboard admin.
        List<Aula> aule = aulaRepository.findAll();
        model.addAttribute("aule", aule);

        // Aggiunge il nome utente al modello.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        model.addAttribute("username", auth.getName());

        return "admin/amministratoreDashboard"; // Restituisce la vista della dashboard admin.
    }

    /**
     * Gestisce la richiesta per la dashboard dello studente.
     * Richiede un ruolo di STUDENTE per l'accesso.
     * Mostra le aule disponibili e le prenotazioni specifiche dello studente corrente.
     *
     * @param model Modello per passare dati alla vista.
     * @param principal Oggetto Principal fornito da Spring Security, che rappresenta l'utente autenticato.
     * Consente di ottenere il nome utente (email in questo caso).
     * @return Il nome della vista ("studente/studenteDashboard.html") da renderizzare.
     */
    @GetMapping("studenteDashboard") // Mappa le richieste GET per "/studenteDashboard".
    public String studenteDashboard(Model model, Principal principal) {
        // Recupera solo le aule che sono attualmente "attive" (disponibili per la prenotazione).
        List<Aula> aule = aulaRepository.findByAttivaTrue();
        model.addAttribute("aule", aule);

        // Recupera tutte le prenotazioni associate all'utente corrente tramite la sua email.
        List<Prenotazione> prenotazioni = prenotazioneRepository.findByUtenteEmail(principal.getName());

        // Logica per aggiornare dinamicamente lo stato delle prenotazioni:
        // se una prenotazione è ancora marcata come attiva ma la sua ora di fine è nel passato,
        // la imposta come non attiva e la salva nel database.
        LocalDateTime now = LocalDateTime.now(); // Ottiene l'ora corrente.
        for (Prenotazione p : prenotazioni) {
            if (p.isAttiva() && p.getFine().isBefore(now)) { // Controlla se è attiva e scaduta.
                p.setAttiva(false); // Aggiorna lo stato.
                prenotazioneRepository.save(p); // Persiste la modifica nel database.
            }
        }

        model.addAttribute("prenotazioni", prenotazioni); // Aggiunge la lista delle prenotazioni al modello.

        // Aggiunge il nome utente al modello.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        model.addAttribute("username", auth.getName());

        return "studente/studenteDashboard"; // Restituisce la vista della dashboard studente.
    }

    /**
     * Gestisce la richiesta per la dashboard del professore.
     * Richiede un ruolo di PROFESSORE per l'accesso.
     * Mostra le aule disponibili e le prenotazioni specifiche del professore corrente.
     *
     * @param model Modello per passare dati alla vista.
     * @param principal Oggetto Principal fornito da Spring Security, che rappresenta l'utente autenticato.
     * Consente di ottenere il nome utente (email in questo caso).
     * @return Il nome della vista ("studente/studenteDashboard.html") da renderizzare.
     */
    @GetMapping("professoreDashboard") // Mappa le richieste GET per "/studenteDashboard".
    public String professoreDashboard(Model model, Principal principal) {
        // Recupera solo le aule che sono attualmente "attive" (disponibili per la prenotazione).
        List<Aula> aule = aulaRepository.findByAttivaTrue();
        model.addAttribute("aule", aule);

        // Recupera tutte le prenotazioni associate all'utente corrente tramite la sua email.
        List<Prenotazione> prenotazioni = prenotazioneRepository.findByUtenteEmail(principal.getName());

        // Logica per aggiornare dinamicamente lo stato delle prenotazioni:
        // se una prenotazione è ancora marcata come attiva ma la sua ora di fine è nel passato,
        // la imposta come non attiva e la salva nel database.
        LocalDateTime now = LocalDateTime.now(); // Ottiene l'ora corrente.
        for (Prenotazione p : prenotazioni) {
            if (p.isAttiva() && p.getFine().isBefore(now)) { // Controlla se è attiva e scaduta.
                p.setAttiva(false); // Aggiorna lo stato.
                prenotazioneRepository.save(p); // Persiste la modifica nel database.
            }
        }

        model.addAttribute("prenotazioni", prenotazioni); // Aggiunge la lista delle prenotazioni al modello.

        // Aggiunge il nome utente al modello.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        model.addAttribute("username", auth.getName());


        return "professore/professoreDashboard"; // Restituisce la vista della dashboard studente.
    }

    /**
     * Mostra la pagina di login.
     * Non richiede autenticazione (permitAll in SecurityConfig).
     *
     * @return Il nome della vista ("login.html") da renderizzare.
     */
    @GetMapping("login") // Mappa le richieste GET per "/login".
    public String login() {
        return "login"; // Restituisce la vista del form di login.
    }

    /**
     * Mostra il form di registrazione per un nuovo utente.
     * Inizializza un nuovo oggetto User vuoto per il binding del form.
     *
     * @param model Modello per passare dati alla vista.
     * @return Il nome della vista ("registrazione.html") da renderizzare.
     */
    @GetMapping("/registrazione") // Mappa le richieste GET per "/registrazione".
    public String registrazioneForm(Model model) {
        model.addAttribute("user", new User()); // Aggiunge un oggetto User vuoto al modello per il form.
        return "registrazione"; // Restituisce la vista del form di registrazione.
    }

    /**
     * Gestisce l'invio del form di registrazione.
     * Processa i dati del nuovo utente, validando le password e l'email, e salva l'utente nel database.
     *
     * @param user Oggetto User popolato con i dati inseriti nel form.
     * @param confirmPassword Stringa per la conferma della password, separata per la validazione.
     * @param role Stringa che rappresenta il ruolo selezionato ("STUDENTE" o "AMMINISTRATORE").
     * @param model Modello per passare dati alla vista (es. messaggi di errore).
     * @return Redirect alla pagina di login in caso di successo, o al form di registrazione in caso di errori.
     */
    @PostMapping("/registrazione") // Mappa le richieste POST per "/registrazione".
    public String registrazioneSubmit(@ModelAttribute("user") User user, // Binda i campi del form all'oggetto User.
                                      @RequestParam("confirmPassword") String confirmPassword, // Parametro specifico per la conferma password.
                                      @RequestParam("role") String role, // Parametro specifico per il ruolo.
                                      Model model) {
        // 1. Verifica che le password inserite nei due campi coincidano.
        if (!user.getPassword().equals(confirmPassword)) {
            model.addAttribute("passwordError", "Le password non coincidono."); // Aggiunge messaggio di errore.
            return "registrazione"; // Ritorna al form di registrazione.
        }

        // 2. Verifica se l'email fornita è già registrata nel database.
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            model.addAttribute("emailError", "Email già in uso."); // Aggiunge messaggio di errore.
            return "registrazione"; // Ritorna al form di registrazione.
        }

        // 3. Imposta il ruolo dell'utente convertendo la stringa in un'enum `UserRole`.
        try {
            user.setRuolo(UserRole.valueOf(role)); // Converte la stringa in enum.
        } catch (IllegalArgumentException e) {
            // Cattura l'eccezione se la stringa del ruolo non corrisponde a un valore valido di `UserRole`.
            model.addAttribute("roleError", "Ruolo non valido.");
            return "registrazione"; // Ritorna al form di registrazione.
        }

        // 4. Salva il nuovo utente nel database, con la password cifrata (BCrypt).
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);

        // 5. Reindirizza l'utente alla pagina di login con un flag di successo.
        return "redirect:/login?registrato=true";
    }

    /**
     * Gestisce le richieste per la pagina di gestione degli annunci.
     * Accessibile solo agli utenti con ruolo AMMINISTRATORE.
     *
     * @return Il nome della vista ("adminAnnunci.html") da renderizzare.
     */
    @GetMapping("/admin/annunci")
    @PreAuthorize("hasRole('AMMINISTRATORE')")
    public String gestioneAnnunci() {
        return "adminAnnunci"; // Nome del file HTML senza estensione
    }

    /**
     * Gestisce le richieste per la pagina di gestione degli utenti.
     * Mostra l'interfaccia per la gestione degli utenti del sistema.
     *
     * @param model Modello per passare dati alla vista.
     * @param principal Oggetto Principal che rappresenta l'utente autenticato.
     * @return Il nome della vista ("admin-users.html") da renderizzare.
     */
    @GetMapping("/admin/users") // nuovo controller per la pagina di gestione utenti
    public String showUserManagementPage(Model model, Principal principal) {
        model.addAttribute("username", principal.getName());
        return "admin-users"; // Nome del file HTML
    }

}
