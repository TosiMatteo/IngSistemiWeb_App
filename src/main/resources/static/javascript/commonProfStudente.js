// /js/common.js

/**
 * Libreria condivisa per le funzionalità comuni alle pagine studente e professore.
 * Contiene funzioni di utilità, gestione delle API, e manipolazione del DOM.
 */

// --- STATO GLOBALE E COSTANTI ---

const dataDisponibilitaInput = document.getElementById("dataDisponibilita");
const aulaDisponibilitaSelect = document.getElementById("aulaDisponibilita");
const disponibilitaGrid = document.getElementById("disponibilitaGrid");

let prenotazioneDaTerminareId = null; // Unica variabile globale per l'ID della prenotazione

// Impostazione del token CSRF come header predefinito per tutte le richieste Axios.
// Assicurati che il meta tag esista nella pagina.
const csrfMeta = document.querySelector('meta[name="_csrf"]');
if (csrfMeta) {
    const CSRF_TOKEN = csrfMeta.content;
    const CSRF_HEADER = document.querySelector('meta[name="_csrf_header"]').content;
    axios.defaults.headers.common[CSRF_HEADER] = CSRF_TOKEN;
}

// --- FUNZIONI DI UTILITÀ ---

/**
 * Mostra una notifica a schermo.
 * @param {string} message Il messaggio da visualizzare.
 * @param {boolean} isSuccess True per notifica di successo, false per errore.
 */
function showNotification(message, isSuccess = true) {
    const container = document.querySelector('.section .container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${isSuccess ? 'is-success' : 'is-danger'} is-light`;
    notification.innerHTML = `<button class="delete"></button>${message}`;
    container.prepend(notification);

    notification.querySelector('.delete').addEventListener('click', () => notification.remove());
    setTimeout(() => notification.remove(), 5000);
}

/**
 * Formatta un oggetto Date in una stringa YYYY-MM-DD.
 * @param {Date} date L'oggetto Date da formattare.
 * @returns {string} La data formattata.
 */
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Converte una data e un'ora locali in una stringa ISO 8601 con offset per le API.
 * @param {string} dateString Data 'YYYY-MM-DD'.
 * @param {string} timeString Ora 'HH:mm'.
 * @returns {string} Stringa in formato ISO 8601.
 */
function formatDateTimeForAPI(dateString, timeString) {
    const localDate = new Date(`${dateString}T${timeString}`);
    const offset = -localDate.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const pad = num => String(num).padStart(2, '0');
    const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
    const offsetMinutes = pad(Math.abs(offset) % 60);

    return `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:00.000${sign}${offsetHours}:${offsetMinutes}`;
}

async function loadDisponibilita() {
    const data = dataDisponibilitaInput.value;
    const aulaId = aulaDisponibilitaSelect.value;
    const grid = disponibilitaGrid;
    grid.innerHTML = ""; // Pulisce la griglia

    if (!data || !aulaId) {
        grid.innerHTML = '<p class="has-text-grey">Seleziona un\'aula e una data per vedere la disponibilità.</p>';
        return;
    }

    try {
        const response = await axios.get(`/api/aule/${aulaId}/disponibilita`, { params: { data } });
        renderDisponibilit(response.data);
    } catch (error) {
        console.error("Errore disponibilità:", error);
        showNotification('Errore nel caricamento della disponibilità delle aule.', false);
        grid.innerHTML = '<p class="has-text-danger">Impossibile caricare la disponibilità.</p>';
    }
}

function renderDisponibilit(slots) {
    const grid = disponibilitaGrid;
    grid.innerHTML = '';
    if (slots.length === 0) {
        grid.innerHTML = '<p class="has-text-grey">Nessun slot disponibile per la data e l\'aula selezionate.</p>';
        return;
    }

    let headerRow = document.createElement('div');
    headerRow.className = 'column is-full has-text-centered has-text-weight-bold is-size-5';
    headerRow.textContent = `Disponibilità per ${dataDisponibilitaInput.value}`;
    grid.appendChild(headerRow);

    slots.forEach(slot => {
        const col = document.createElement("div");
        col.className = "column is-one-fifth";

        const available = slot.liberi > 0;
        const inizio = new Date(slot.inizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const fine = new Date(slot.fine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const box = document.createElement("div");
        box.className = `box has-text-centered dispo-tile ${available ? 'has-background-success-light' : 'has-background-danger-light'}`;

        box.innerHTML = `
                <p class="time has-text-weight-semibold">${inizio} – ${fine}</p>
                <p class="count">${available ? `<span>${slot.liberi} posti</span>` : `<span class="has-text-danger">Pieno</span>`}</p>
            `;

        col.appendChild(box);
        grid.appendChild(col);
    });
}

// --- FUNZIONI DI MANIPOLAZIONE DEL DOM ---

/**
 * Genera opzioni per un <select> di orari con intervalli di 30 minuti.
 * @param {number} startHour L'ora di inizio (es. 8 per 08:00).
 * @param {number} endHour L'ora di fine (es. 19 per 19:00).
 * @returns {string[]} Un array di orari formattati "HH:mm".
 */
function generateTimeOptions(startHour, endHour) {
    const options = [];
    for (let h = startHour; h <= endHour; h++) {
        for (let m of [0, 30]) {
            if (h === endHour && m > 0 && endHour < 20) break; // Orari fino alle 19:30
            options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return options;
}

/**
 * Popola il select per l'orario di inizio.
 * @param {HTMLSelectElement} selectElement L'elemento <select> da popolare.
 */
function populateOrarioInizio(selectElement) {
    selectElement.innerHTML = '<option value="">-- Seleziona --</option>';
    const orari = generateTimeOptions(8, 19);
    orari.forEach(time => {
        selectElement.innerHTML += `<option value="${time}">${time}</option>`;
    });
}

/**
 * Popola il select per l'orario di fine basandosi sull'inizio selezionato.
 * @param {HTMLSelectElement} inizioSelect L'elemento <select> dell'orario di inizio.
 * @param {HTMLSelectElement} fineSelect L'elemento <select> dell'orario di fine.
 */
function populateOrarioFine(inizioSelect, fineSelect) {
    const inizio = inizioSelect.value;
    fineSelect.innerHTML = '<option value="">-- Seleziona --</option>';

    if (!inizio) {
        fineSelect.disabled = true;
        fineSelect.innerHTML = '<option value="">-- Seleziona l\'orario di inizio --</option>';
        return;
    }

    const startTime = new Date(`1970-01-01T${inizio}:00`);
    const maxDurationInMs = 4 * 60 * 60 * 1000;
    const closingTime = new Date(`1970-01-01T20:00:00`);

    for (let i = 1; i <= 8; i++) { // Max 8 intervalli da 30 min = 4 ore
        const endTime = new Date(startTime.getTime() + i * 30 * 60 * 1000);
        if (endTime > closingTime) break;

        const timeString = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
        fineSelect.innerHTML += `<option value="${timeString}">${timeString}</option>`;
    }
    fineSelect.disabled = false;
}

/**
 * Aggiunge event listener per chiudere una modale.
 * @param {string} modalId L'ID della modale.
 */
function setupModalClosers(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.querySelectorAll('.delete, .modal-background, .modal-card-foot .button:not(.is-danger):not(.is-success):not(.is-warning)')
        .forEach(el => el.addEventListener('click', () => chiudiModal(modalId)));
}

/**
 * Apre una modale e opzionalmente imposta un ID per un'azione.
 * @param {string} modalId ID della modale.
 * @param {number|string|null} id ID della prenotazione (o altro dato).
 */
function apriModal(modalId, id = null) {
    const modal = document.getElementById(modalId);
    if(modalId === 'modal-termina-prenotazione') {
        prenotazioneDaTerminareId = id;
    }
    // Aggiungere qui altre logiche per altre modali se necessario
    if (modal) modal.classList.add('is-active');
}

/**
 * Chiude una modale e resetta le variabili di stato associate.
 * @param {string} modalId ID della modale.
 */
function chiudiModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('is-active');

    if(modalId === 'modal-termina-prenotazione') {
        prenotazioneDaTerminareId = null;
    }
}