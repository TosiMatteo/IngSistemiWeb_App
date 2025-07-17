// Il codice viene eseguito solo quando l'intero documento HTML è stato caricato.
document.addEventListener('DOMContentLoaded', () => {

    // --- Setup CSRF (Cross-Site Request Forgery) per Axios ---
    // Recupera e imposta il token CSRF come header predefinito per tutte le richieste Axios,
    // garantendo la sicurezza delle operazioni di scrittura (POST, PUT, DELETE).
    const csrfToken = document.querySelector('meta[name="_csrf"]').content;
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]').content;
    axios.defaults.headers.common[csrfHeader] = csrfToken;

    // --- Riferimenti agli elementi del DOM ---
    // Ottiene i riferimenti agli elementi HTML chiave con cui il JavaScript interagirà.
    const usersTableBody = document.getElementById('users-table-body');
    const editModal = document.getElementById('edit-user-modal');
    const saveUserButton = document.getElementById('save-user-button');
    const searchInput = document.getElementById('user-search-input');
    const roleFilterContainer = document.getElementById('role-filter-buttons');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');

    // --- Stato della UI (interfaccia utente) ---
    // Variabili per gestire la paginazione, i filtri di ricerca e altri stati dell'interfaccia.
    let paginaCorrente = 0; // Inizializza la pagina corrente alla prima pagina (indice 0).
    let filtroRuolo = 'tutti'; // Imposta il filtro ruolo predefinito su 'tutti'.
    let searchTerm = ''; // Inizializza il termine di ricerca a vuoto.
    let isLastPage = false; // Flag per indicare se è stata raggiunta l'ultima pagina di risultati.
    let debounceTimer; // Usato per il "debounce" della funzione di ricerca.
    const UTENTI_PER_PAGINA = 8; // Definisce il numero di utenti da caricare per ogni richiesta.
    let currentUserId = null; // Memorizza l'ID dell'utente attualmente in modifica.

    /**
     * Carica gli utenti dal backend, applicando i filtri di ricerca e la logica di paginazione.
     * Questa è la funzione principale per recuperare e visualizzare i dati degli utenti.
     * @param {boolean} reset - Se true, resetta la paginazione e pulisce la tabella prima di caricare nuovi dati.
     */
    async function loadUsers(reset = false) {
        // Resetta la paginazione e lo stato dell'ultima pagina se richiesto (es. cambio filtro/ricerca).
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
        }

        // Evita richieste inutili se siamo già all'ultima pagina e non è un reset.
        if (isLastPage && !reset) return;

        try {
            // Effettua una richiesta GET al backend, inviando i parametri di paginazione e filtro.
            const response = await axios.get('/api/admin/users', {
                params: {
                    page: paginaCorrente,
                    size: UTENTI_PER_PAGINA,
                    ruolo: filtroRuolo === 'tutti' ? null : filtroRuolo, // Invia 'null' se il filtro è 'tutti'.
                    searchTerm: searchTerm,
                    sort: 'id,asc' // Ordina i risultati per ID.
                }
            });

            const page = response.data; // Ottiene l'oggetto Page contenente gli utenti e le info di paginazione.
            renderUsers(page.content, reset); // Renderizza gli utenti nella tabella.
            isLastPage = page.last; // Aggiorna il flag dell'ultima pagina.

            // Mostra o nasconde il bottone "Mostra di più" in base allo stato di isLastPage.
            mostraDiPiuBtn.classList.toggle('is-hidden', isLastPage);

        } catch (error) {
            // Gestisce e logga eventuali errori durante il caricamento degli utenti, mostrando un messaggio all'utente.
            console.error('Errore nel caricamento degli utenti:', error);
            usersTableBody.innerHTML = '<tr><td colspan="6" class="has-text-danger">Impossibile caricare gli utenti.</td></tr>';
        }
    }

    /**
     * Disegna le righe degli utenti nella tabella HTML.
     * @param {Array} users - Un array di oggetti utente da visualizzare.
     * @param {boolean} reset - Se true, pulisce la tabella prima di aggiungere le nuove righe; altrimenti, aggiunge le righe.
     */
    function renderUsers(users, reset) {
        // Se reset è true, svuota completamente il contenuto della tabella.
        if (reset) {
            usersTableBody.innerHTML = '';
        }

        // Se non ci sono utenti e si sta eseguendo un reset, visualizza un messaggio di "nessun utente trovato".
        if (users.length === 0 && reset) {
            usersTableBody.innerHTML = '<tr><td colspan="6" class="has-text-grey-light has-text-centered">Nessun utente trovato con i criteri specificati.</td></tr>';
            return;
        }

        // Mappa ogni oggetto utente in una stringa HTML che rappresenta una riga della tabella.
        const rowsHtml = users.map(user => {
            // Gli amministratori non possono essere modificati o eliminati tramite questa interfaccia.
            const canBeModified = user.ruolo !== 'AMMINISTRATORE';
            const actionsHtml = canBeModified ? `
                <div class="buttons">
                    <button class="button is-small is-info" onclick="openEditModal(${user.id}, '${user.nome}', '${user.cognome}', '${user.email}')">Modifica</button>
                    <button class="button is-small is-danger" onclick="deleteUser(${user.id})">Elimina</button>
                </div>
            ` : 'N/A';

            return `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.nome}</td>
                    <td>${user.cognome}</td>
                    <td>${user.email}</td>
                    <td><span class="tag is-primary">${user.ruolo}</span></td>
                    <td>${actionsHtml}</td>
                </tr>
            `;
        }).join(''); // Unisce tutti i frammenti HTML delle righe in un'unica stringa.

        // Aggiunge le righe HTML generate al corpo della tabella.
        usersTableBody.innerHTML += rowsHtml;
    }

    // --- Funzioni per Modali e Azioni CRUD ---

    /**
     * Apre la modale di modifica utente, popolando i suoi campi con i dati dell'utente selezionato.
     * Questa funzione è accessibile globalmente (tramite `window`) per essere chiamata dagli eventi `onclick` nell'HTML.
     */
    window.openEditModal = (id, nome, cognome, email) => {
        currentUserId = id;
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-user-nome').value = nome;
        document.getElementById('edit-user-cognome').value = cognome;
        document.getElementById('edit-user-email').value = email;
        document.getElementById('edit-user-password').value = ''; // La password viene azzerata per sicurezza.
        editModal.classList.add('is-active'); // Attiva la visibilità della modale.
    };

    /**
     * Funzione helper per chiudere tutte le modali aperte.
     */
    const closeModals = () => {
        editModal.classList.remove('is-active'); // Disattiva la visibilità della modale.
    };

    // Gestisce il click sul bottone "Salva" all'interno della modale di modifica utente.
    saveUserButton.addEventListener('click', async () => {
        // Raccoglie i dati aggiornati dai campi della modale.
        const userData = {
            nome: document.getElementById('edit-user-nome').value,
            cognome: document.getElementById('edit-user-cognome').value,
            email: document.getElementById('edit-user-email').value,
            password: document.getElementById('edit-user-password').value,
        };

        try {
            // Invia una richiesta PUT al backend per aggiornare l'utente.
            await axios.put(`/api/admin/users/${currentUserId}`, userData);
            closeModals(); // Chiude la modale.
            loadUsers(true); // Ricarica la tabella degli utenti per mostrare le modifiche.
            alert('Utente aggiornato con successo!');
        } catch (error) {
            console.error("Errore durante l'aggiornamento:", error);
            alert('Errore: impossibile aggiornare l\'utente.');
        }
    });

    /**
     * Elimina un utente dal sistema dopo una richiesta di conferma.
     * Questa funzione è accessibile globalmente per essere chiamata dagli eventi `onclick` nell'HTML.
     */
    window.deleteUser = async (id) => {
        // Chiede conferma all'utente prima di procedere con l'eliminazione irreversibile.
        if (confirm(`Sei sicuro di voler eliminare l'utente con ID ${id}? Questa azione è irreversibile.`)) {
            try {
                // Invia una richiesta DELETE al backend per eliminare l'utente.
                await axios.delete(`/api/admin/users/${id}`);
                loadUsers(true); // Ricarica la tabella degli utenti per riflettere l'eliminazione.
                alert('Utente eliminato con successo.');
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                alert('Errore: impossibile eliminare l\'utente.');
            }
        }
    };

    // --- Setup Event Listeners (Gestione degli Eventi dell'Interfaccia) ---

    // Aggiunge event listeners per chiudere la modale di modifica cliccando sullo sfondo, sul pulsante 'x' o sul pulsante "Annulla".
    editModal.querySelectorAll('.modal-background, .delete, .modal-card-foot .button:not(.is-success)').forEach(el => {
        el.addEventListener('click', closeModals);
    });

    // Gestisce i click sui bottoni di filtro per ruolo.
    roleFilterContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            // Rimuove e aggiunge la classe 'is-link' per evidenziare il filtro attivo.
            roleFilterContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');
            filtroRuolo = event.target.dataset.filtro; // Aggiorna il filtro ruolo.
            loadUsers(true); // Ricarica gli utenti con il nuovo filtro, resettando la paginazione.
        }
    });

    // Gestisce l'input nel campo di ricerca con un meccanismo di "debounce".
    // Questo evita di inviare troppe richieste al server mentre l'utente sta digitando.
    searchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer); // Cancella il timer precedente.
        searchTerm = event.target.value; // Aggiorna il termine di ricerca.
        // Imposta un nuovo timer: la ricerca verrà eseguita dopo 400ms di inattività.
        debounceTimer = setTimeout(() => {
            loadUsers(true);
        }, 400);
    });

    // Gestisce il click sul bottone "Mostra di più" per caricare la pagina successiva di utenti.
    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++;
        loadUsers(false); // Carica la pagina successiva senza resettare la tabella.
    });

    // --- Caricamento Iniziale ---
    loadUsers(true);
});