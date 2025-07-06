/**
 * /javascript/professoreprenotazione.js
 * Logica specifica per la dashboard del professore.
 */
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CONFIGURAZIONE PRENOTAZIONE INTERATTIVA ---
    const configProfessore = {
        dataInputId: 'data-prenotazione-input',
        aulaSelectId: 'aula-prenotazione-select',
        gridId: 'disponibilita-grid-interattiva',
        summaryId: 'booking-summary',
        confirmBtnId: 'conferma-prenotazione-btn',
        resetBtnId: 'reset-selection-btn', // Aggiunto per coerenza
        apiEndpoint: '/api/professore/prenotazioni',
        maxDurationSlots: 8, // 4 ore. Puoi cambiarlo se necessario.
        setupDatePicker: (datePicker) => {
            const today = new Date();
            const minDate = new Date();
            minDate.setDate(today.getDate() + 2); // Preavviso di 2 giorni
            datePicker.min = formatDateForInput(minDate);

            const maxDate = new Date();
            maxDate.setDate(today.getDate() + 14); // Massimo 14 giorni
            datePicker.max = formatDateForInput(maxDate);
        }
    };

    // Inizializza il componente comune con la configurazione del professore
    inizializzaBookingInterattivo(configProfessore);


    // --- 2. LOGICA PER LA LISTA "LE MIE PRENOTAZIONI" ---
    const prenotazioniTableBody = document.getElementById('prenotazioniProfessoreTable');
    const filtriBtnContainer = document.getElementById('filtri-prenotazioni');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');
    const confermaAnnullamentoBtn = document.getElementById('confermaTerminaProfessoreBtn');

    let paginaCorrente = 0;
    let filtroCorrente = 'tutte';
    let isLastPage = false;
    const PRENOTAZIONI_PER_PAGINA = 8;

    async function loadPrenotazioniProfessore(reset = false) {
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
        }
        if (isLastPage && !reset) return;

        try {
            const response = await axios.get('/api/professore/prenotazioni', {
                params: { stato: filtroCorrente, page: paginaCorrente, size: PRENOTAZIONI_PER_PAGINA, sort: 'inizio,desc' }
            });
            const page = response.data;
            renderPrenotazioniProfessore(page.content, reset);
            isLastPage = page.last;
            mostraDiPiuBtn.classList.toggle('is-hidden', isLastPage);
        } catch (error) {
            showNotification("Errore nel caricamento delle prenotazioni.", false);
        }
    }
    window.loadMiePrenotazioni = loadPrenotazioniProfessore;

    function renderPrenotazioniProfessore(prenotazioni, reset) {
        if (reset) prenotazioniTableBody.innerHTML = '';
        if (prenotazioni.length === 0 && reset) {
            prenotazioniTableBody.innerHTML = '<tr><td colspan="6" class="has-text-grey">Nessuna prenotazione trovata.</td></tr>';
            return;
        }
        const rowsHtml = prenotazioni.map(p => {
            const inizio = new Date(p.inizio);
            const statoClass = p.attiva ? 'is-success' : 'is-light';
            const statoText = p.attiva ? 'Attiva' : 'Terminata';
            const bottoneTermina = p.attiva ? `<button class="button is-small is-warning" onclick="apriModal('modal-termina-prenotazione', ${p.id})">Termina</button>` : '';
            return `
                <tr>
                    <td>${p.aula.nome}</td>
                    <td>${inizio.toLocaleDateString('it-IT')}</td>
                    <td>${inizio.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${new Date(p.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span class="tag ${statoClass}">${statoText}</span></td>
                    <td>${bottoneTermina}</td>
                </tr>
            `;
        }).join('');
        prenotazioniTableBody.innerHTML += rowsHtml;
    }

    async function terminaPrenotazioneProfessore() {
        if (!prenotazioneDaTerminareId) return;
        try {
            await axios.post(`/api/professore/prenotazioni/${prenotazioneDaTerminareId}/termina`);
            showNotification('Prenotazione terminata con successo.', true);
            chiudiModal('modal-termina-prenotazione');
            loadPrenotazioniProfessore(true);
        } catch (error) {
            showNotification(error.response?.data || "Errore durante la terminazione.", false);
        }
    }

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

    confermaAnnullamentoBtn.addEventListener('click', terminaPrenotazioneProfessore);
    setupModalClosers('modal-termina-prenotazione');

    loadPrenotazioniProfessore(true);
});