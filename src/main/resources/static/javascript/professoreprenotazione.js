/**
 * /javascript/professoreprenotazione.js
 * Logica specifica per la dashboard del professore.
 * Gestisce la prenotazione delle aule e la visualizzazione delle prenotazioni esistenti,
 * con regole specifiche per i professori (preavviso di 2 giorni, prenotazione fino a 14 giorni).
 */
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CONFIGURAZIONE PRENOTAZIONE INTERATTIVA ---
    /**
     * Configurazione specifica per la prenotazione da parte dei professori.
     * I professori devono prenotare con almeno 2 giorni di preavviso e possono
     * prenotare fino a 14 giorni in anticipo.
     */
    const configProfessore = {
        dataInputId: 'data-prenotazione-input',
        aulaSelectId: 'aula-prenotazione-select',
        gridId: 'disponibilita-grid-interattiva',
        summaryId: 'booking-summary',
        confirmBtnId: 'conferma-prenotazione-btn',
        resetBtnId: 'reset-selection-btn',
        apiEndpoint: '/api/professore/prenotazioni',
        maxDurationSlots: 8, // 4 ore (8 slot da 30 minuti)
        /**
         * Configura il selettore di date per i professori:
         * - Data minima: oggi + 2 giorni (preavviso obbligatorio)
         * - Data massima: oggi + 14 giorni
         * 
         * @param {HTMLInputElement} datePicker - L'elemento input di tipo date da configurare
         */
        setupDatePicker: (datePicker) => {
            const today = new Date();

            // Imposta la data minima (oggi + 2 giorni di preavviso)
            const minDate = new Date();
            minDate.setDate(today.getDate() + 2);
            datePicker.min = formatDateForInput(minDate);

            // Imposta la data massima (oggi + 14 giorni)
            const maxDate = new Date();
            maxDate.setDate(today.getDate() + 14);
            datePicker.max = formatDateForInput(maxDate);
        }
    };

    // Inizializza il componente comune con la configurazione del professore
    inizializzaBookingInterattivo(configProfessore);


    // --- 2. LOGICA PER LA LISTA "LE MIE PRENOTAZIONI" ---
    /**
     * Elementi DOM per la gestione della lista delle prenotazioni del professore
     */
    const prenotazioniTableBody = document.getElementById('prenotazioniProfessoreTable');
    const filtriBtnContainer = document.getElementById('filtri-prenotazioni');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');
    const confermaAnnullamentoBtn = document.getElementById('confermaTerminaProfessoreBtn');

    /**
     * Variabili di stato per la paginazione e il filtraggio delle prenotazioni
     */
    let paginaCorrente = 0;          // Pagina corrente per la paginazione
    let filtroCorrente = 'tutte';    // Filtro attivo (tutte, attive, terminate)
    let isLastPage = false;          // Flag per indicare se siamo all'ultima pagina
    const PRENOTAZIONI_PER_PAGINA = 8; // Numero di prenotazioni da visualizzare per pagina

    /**
     * Carica le prenotazioni del professore dal server.
     * Supporta la paginazione e il filtraggio per stato.
     * 
     * @param {boolean} reset - Se true, resetta la paginazione e ricarica dalla prima pagina
     */
    async function loadPrenotazioniProfessore(reset = false) {
        // Reset della paginazione se richiesto
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
        }
        // Non caricare altre pagine se siamo già all'ultima
        if (isLastPage && !reset) return;

        try {
            // Richiesta API con parametri di paginazione e filtro
            const response = await axios.get('/api/professore/prenotazioni', {
                params: { 
                    stato: filtroCorrente, 
                    page: paginaCorrente, 
                    size: PRENOTAZIONI_PER_PAGINA, 
                    sort: 'inizio,desc' // Ordina per data di inizio decrescente
                }
            });
            const page = response.data;
            renderPrenotazioniProfessore(page.content, reset);
            isLastPage = page.last;
            // Nascondi il pulsante "Mostra di più" se siamo all'ultima pagina
            mostraDiPiuBtn.classList.toggle('is-hidden', isLastPage);
        } catch (error) {
            showNotification("Errore nel caricamento delle prenotazioni.", false);
        }
    }
    // Esponi la funzione globalmente per permettere l'aggiornamento dopo una nuova prenotazione
    window.loadMiePrenotazioni = loadPrenotazioniProfessore;

    /**
     * Renderizza le prenotazioni del professore nella tabella.
     * Gestisce diversi stati delle prenotazioni (attiva, terminata)
     * e mostra pulsanti di azione appropriati in base allo stato.
     * 
     * @param {Array} prenotazioni - Array di oggetti prenotazione da visualizzare
     * @param {boolean} reset - Se true, svuota la tabella prima di aggiungere le nuove righe
     */
    function renderPrenotazioniProfessore(prenotazioni, reset) {
        // Se reset è true, svuota la tabella
        if (reset) prenotazioniTableBody.innerHTML = '';

        // Mostra messaggio se non ci sono prenotazioni
        if (prenotazioni.length === 0 && reset) {
            prenotazioniTableBody.innerHTML = '<tr><td colspan="6" class="has-text-grey">Nessuna prenotazione trovata.</td></tr>';
            return;
        }

        const rowsHtml = prenotazioni.map(p => {
            const inizioPrenotazione = new Date(p.inizio);

            // Determinazione dello stato visivo
            const statoHtml = p.attiva
                ? '<span class="tag is-success is-light"><i class="fas fa-check-circle mr-1"></i> Attiva</span>'
                : '<span class="tag is-danger is-light"><i class="fas fa-times-circle mr-1"></i> Terminata</span>';

            // Mostra il pulsante "Termina" solo per le prenotazioni attive
            const bottoneTermina = p.attiva 
                ? `<button class="button is-small is-danger" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>`
                : '';

            // Costruzione della riga HTML
            return `
                <tr>
                    <td>${p.aula.nome}</td>
                    <td>${inizioPrenotazione.toLocaleDateString('it-IT')}</td>
                    <td>${inizioPrenotazione.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${new Date(p.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${statoHtml}</td>
                    <td>${bottoneTermina}</td>
                </tr>
            `;
        }).join('');

        // Aggiungi le righe alla tabella
        prenotazioniTableBody.innerHTML += rowsHtml;
    }

    /**
     * Termina una prenotazione attiva del professore.
     * Utilizza l'ID memorizzato in prenotazioneDaTerminareId, impostato quando si apre il modale di conferma.
     */
    async function terminaPrenotazioneProfessore() {
        if (!prenotazioneDaTerminareId) return;
        try {
            // Invia la richiesta di terminazione
            await axios.post(`/api/professore/prenotazioni/${prenotazioneDaTerminareId}/termina`);
            showNotification('Prenotazione terminata con successo.', true);
            chiudiModal('modal-termina-prenotazione');
            // Ricarica la lista per mostrare lo stato aggiornato
            loadPrenotazioniProfessore(true);
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la terminazione.", false);
        }
    }

    /**
     * Gestisce il click sui pulsanti di filtro delle prenotazioni.
     * Cambia il filtro attivo e ricarica la lista delle prenotazioni.
     */
    filtriBtnContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            // Aggiorna lo stile del pulsante attivo
            filtriBtnContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');

            // Imposta il nuovo filtro e ricarica le prenotazioni
            filtroCorrente = event.target.dataset.filtro;
            loadPrenotazioniProfessore(true);
        }
    });

    /**
     * Gestisce il click sul pulsante "Mostra di più".
     * Incrementa la pagina corrente e carica la pagina successiva di prenotazioni.
     */
    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++;
        loadPrenotazioniProfessore(false); // false = non resettare, aggiungere alla lista esistente
    });

    /**
     * Collega il pulsante di conferma annullamento all'azione di terminazione.
     */
    confermaAnnullamentoBtn.addEventListener('click', terminaPrenotazioneProfessore);

    // Inizializzazione del modale di terminazione
    setupModalClosers('modal-termina-prenotazione');

    // Carica la lista iniziale delle prenotazioni
    loadPrenotazioniProfessore(true);
});
