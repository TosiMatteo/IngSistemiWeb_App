/**
 * Script per la dashboard del professore.
 * Questo file contiene la logica specifica per la pagina del professore
 * e dipende da 'common.js', che deve essere caricato prima.
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- RIFERIMENTI AGLI ELEMENTI DEL DOM ---

    const dataPrenotazioneInput = document.getElementById('dataPrenotazioneProfessore');
    const inizioSelect = document.getElementById('orarioInizioPrenotazioneProfessore');
    const fineSelect = document.getElementById('orarioFinePrenotazioneProfessore');
    const aulaSelect = document.getElementById('aulaSelectProfessore');
    const prenotazioniTableBody = document.getElementById('prenotazioniProfessoreTable');

    const confermaAnnullamentoBtn = document.getElementById('confermaTerminaProfessoreBtn');

    const filtriBtnContainer = document.getElementById('filtri-prenotazioni');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');

    // STATO PER FILTRI E PAGINAZIONE
    let tutteLePrenotazioniCaricate = [];
    let paginaCorrente = 0;
    let filtroCorrente = 'tutte';
    let isLastPage = false;
    const PRENOTAZIONI_PER_PAGINA = 8;

    // --- FUNZIONI SPECIFICHE DELLA PAGINA PROFESSORE ---

    /**
     * Gestisce il processo di prenotazione di un'aula da parte di un professore.
     * Esegue la validazione dei campi e invia una richiesta POST al backend.
     * Utilizza `formatDateTimeForAPI` da `common.js`.
     */
    async function prenotaAula() {
        const aulaId = aulaSelect.value;
        const data = dataPrenotazioneInput.value;
        const inizioOra = inizioSelect.value;
        const fineOra = fineSelect.value;

        if (!aulaId || !data || !inizioOra || !fineOra) {
            showNotification('Per favore, compila tutti i campi per la prenotazione.', false);
            return;
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const selectedDate = new Date(data);
        selectedDate.setHours(0, 0, 0, 0);

        const twoDaysFromNow = new Date(now);
        twoDaysFromNow.setDate(now.getDate() + 2);

        const fourteenDaysFromNow = new Date(now);
        fourteenDaysFromNow.setDate(now.getDate() + 14);

        if (selectedDate.getTime() < twoDaysFromNow.getTime()) {
            showNotification('Le prenotazioni professori devono essere effettuate con un preavviso di almeno 2 giorni.', false);
            return;
        }
        if (selectedDate.getTime() > fourteenDaysFromNow.getTime()) {
            showNotification('Le prenotazioni professori non possono superare i 14 giorni di preavviso.', false);
            return;
        }

        const prenotazioneData = {
            aulaId: aulaId,
            inizio: formatDateTimeForAPI(data, inizioOra),
            fine: formatDateTimeForAPI(data, fineOra),
        };

        try {
            const response = await axios.post('/api/professore/prenotazioni', prenotazioneData);
            showNotification(response.data, true);
            loadPrenotazioniProfessore();
            loadDisponibilita(); // Ricarica la disponibilità dopo aver prenotato

            // Resetta i campi del form dopo la prenotazione
            dataPrenotazioneInput.value = '';
            inizioSelect.value = '';
            fineSelect.value = '';
            aulaSelect.value = '';
            populateOrarioFine(inizioSelect, fineSelect); // Usa la funzione comune
        } catch (error) {
            console.error('Errore nella prenotazione:', error.response ? error.response.data : error.message);
            showNotification(error.response && error.response.data ? error.response.data : 'Errore durante la prenotazione.', false);
        }
    }

    async function loadPrenotazioniProfessore(reset = false) {
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
            tutteLePrenotazioniCaricate = [];
            prenotazioniTableBody.innerHTML = '';
        }
        if (isLastPage) return;

        try {
            const response = await axios.get('/api/professore/prenotazioni', {
                params: {
                    stato: filtroCorrente,
                    page: paginaCorrente,
                    size: PRENOTAZIONI_PER_PAGINA
                }
            });

            const page = response.data;
            tutteLePrenotazioniCaricate.push(...page.content);
            isLastPage = page.last;

            // La funzione di rendering è diversa!
            renderPrenotazioniProfessore(tutteLePrenotazioniCaricate);

            if (isLastPage) {
                mostraDiPiuBtn.classList.add('is-hidden');
            } else {
                mostraDiPiuBtn.classList.remove('is-hidden');
            }
        } catch (error) {
            showNotification("Errore nel caricamento delle prenotazioni del professore.", false);
        }
    }


    /**
     * Renderizza le prenotazioni del professore nella tabella.
     * Utilizza `apriModal` da `common.js`.
     * @param {Array<Object>} prenotazioni - Array di oggetti prenotazione.
     */
    function renderPrenotazioniProfessore(prenotazioni) {
        prenotazioniTableBody.innerHTML = '';
        if (prenotazioni.length === 0) {
            prenotazioniTableBody.innerHTML = '<tr><td colspan="6" class="has-text-grey">Nessuna prenotazione trovata.</td></tr>';
            return;
        }
        prenotazioni.forEach(p => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${p.aula.nome}</td>
                <td>${new Date(p.inizio).toLocaleDateString('it-IT')}</td>
                <td>${new Date(p.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${new Date(p.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                <td><span class="tag ${p.attiva ? 'is-success' : 'is-danger'} is-light">${p.attiva ? 'Attiva' : 'Terminata'}</span></td>
                <td>${p.attiva ? `<button class="button is-small is-warning" onclick="apriModal('modal-annulla-prenotazione', ${p.id})">Termina</button>` : ''}</td>
            `;
            prenotazioniTableBody.appendChild(row);
        });
    }

    /**
     * Funzione per terminare una prenotazione del professore.
     * Viene richiamata dalla modale di conferma.
     * Utilizza `chiudiModal` da `common.js`.
     * @async
     */
    async function terminaPrenotazioneProfessore() {
        // `prenotazioneDaTerminareId` è la variabile globale gestita da common.js
        if (!prenotazioneDaTerminareId) return;
        try {
            const response = await axios.post(`/api/professore/prenotazioni/${prenotazioneDaTerminareId}/termina`);
            showNotification(response.data, true);
            chiudiModal('modal-termina-prenotazione'); // Usa la funzione comune
            loadPrenotazioniProfessore();
            loadDisponibilita(); // Ricarica la disponibilità dopo aver terminato
        } catch (error) {
            const errorMsg = error.response?.data || "Errore durante la terminazione.";
            showNotification(errorMsg, false);
        }
    }


    // Imposta la data di default e i limiti per la prenotazione professore
    const today = new Date();
    dataPrenotazioneInput.min = formatDateForInput(today);

    const minDateProf = new Date(today);
    minDateProf.setDate(today.getDate() + 2);
    dataPrenotazioneInput.min = formatDateForInput(minDateProf); // Usa la funzione comune

    const maxDateProf = new Date(today);
    maxDateProf.setDate(today.getDate() + 14);
    dataPrenotazioneInput.max = formatDateForInput(maxDateProf); // Usa la funzione comune

    dataDisponibilitaInput.value = formatDateForInput(today);


    // Inizializzazione dei dropdown e caricamento dati
    populateOrarioInizio(inizioSelect); // Usa la funzione comune
    populateOrarioFine(inizioSelect, fineSelect); // Inizializza anche l'orario di fine

    // NUOVI EVENT LISTENERS (identici allo studente)
    filtriBtnContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            filtriBtnContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');
            filtroCorrente = event.target.dataset.filtro;
            loadPrenotazioniProfessore(true);
        }
    });

    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++;
        loadPrenotazioniProfessore(false);
    });

    // Caricamento iniziale
    loadPrenotazioniProfessore(true);

    // Event Listeners per la dashboard professore
    aulaDisponibilitaSelect.addEventListener('change', loadDisponibilita);
    dataDisponibilitaInput.addEventListener('change', loadDisponibilita);
    inizioSelect.addEventListener('change', () => populateOrarioFine(inizioSelect, fineSelect)); // Usa la funzione comune
    document.querySelector('button[onclick="prenotaAulaProfessore()"]').onclick = prenotaAula; // Assicurati che il bottone abbia questo onclick

    // Event Listeners per i modali (utilizzando setupModalClosers)
    setupModalClosers('modal-termina-prenotazione');

    // Espone le funzioni necessarie nell'onclick dell'HTML
    // Questo è importante se hai chiamate dirette nell'HTML come onclick="apriModal(...)"
    window.apriModal = apriModal;
});