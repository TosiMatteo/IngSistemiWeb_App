// /javascript/admin-users.js

document.addEventListener('DOMContentLoaded', () => {
    // CSRF setup per Axios
    const csrfToken = document.querySelector('meta[name="_csrf"]').content;
    const csrfHeader = document.querySelector('meta[name="_csrf_header"]').content;
    axios.defaults.headers.common[csrfHeader] = csrfToken;

    // --- Riferimenti agli elementi del DOM ---
    const usersTableBody = document.getElementById('users-table-body');
    const editModal = document.getElementById('edit-user-modal');
    const saveUserButton = document.getElementById('save-user-button');
    const searchInput = document.getElementById('user-search-input');
    const roleFilterContainer = document.getElementById('role-filter-buttons');
    const mostraDiPiuBtn = document.getElementById('mostra-di-piu-btn');

    // --- Stato della UI (filtri, paginazione, ricerca) ---
    let paginaCorrente = 0;
    let filtroRuolo = 'tutti';
    let searchTerm = '';
    let isLastPage = false;
    let debounceTimer;
    const UTENTI_PER_PAGINA = 8;
    let currentUserId = null;

    /**
     * Carica gli utenti dal backend usando i filtri e la paginazione correnti.
     * @param {boolean} reset - Se true, pulisce la tabella e resetta la paginazione.
     */
    async function loadUsers(reset = false) {
        if (reset) {
            paginaCorrente = 0;
            isLastPage = false;
        }

        if (isLastPage && !reset) return;

        try {
            const response = await axios.get('/api/admin/users', {
                params: {
                    page: paginaCorrente,
                    size: UTENTI_PER_PAGINA,
                    ruolo: filtroRuolo === 'tutti' ? null : filtroRuolo,
                    searchTerm: searchTerm,
                    sort: 'id,asc'
                }
            });

            const page = response.data;
            renderUsers(page.content, reset);
            isLastPage = page.last;

            mostraDiPiuBtn.classList.toggle('is-hidden', isLastPage);

        } catch (error) {
            console.error('Errore nel caricamento degli utenti:', error);
            usersTableBody.innerHTML = '<tr><td colspan="6" class="has-text-danger">Impossibile caricare gli utenti.</td></tr>';
        }
    }

    /**
     * Disegna le righe degli utenti nella tabella.
     * @param {Array} users - L'array di utenti da renderizzare.
     * @param {boolean} reset - Se true, il contenuto della tabella viene sostituito. Altrimenti, viene aggiunto.
     */
    function renderUsers(users, reset) {
        if (reset) {
            usersTableBody.innerHTML = '';
        }

        if (users.length === 0 && reset) {
            usersTableBody.innerHTML = '<tr><td colspan="6" class="has-text-grey-light has-text-centered">Nessun utente trovato con i criteri specificati.</td></tr>';
            return;
        }

        const rowsHtml = users.map(user => {
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
        }).join('');

        usersTableBody.innerHTML += rowsHtml;
    }

    // --- Funzioni per Modali e Azioni CRUD ---

    window.openEditModal = (id, nome, cognome, email) => {
        currentUserId = id;
        document.getElementById('edit-user-id').value = id;
        document.getElementById('edit-user-nome').value = nome;
        document.getElementById('edit-user-cognome').value = cognome;
        document.getElementById('edit-user-email').value = email;
        document.getElementById('edit-user-password').value = '';
        editModal.classList.add('is-active');
    };

    const closeModals = () => {
        editModal.classList.remove('is-active');
    };

    saveUserButton.addEventListener('click', async () => {
        const userData = {
            nome: document.getElementById('edit-user-nome').value,
            cognome: document.getElementById('edit-user-cognome').value,
            email: document.getElementById('edit-user-email').value,
            password: document.getElementById('edit-user-password').value,
        };

        try {
            await axios.put(`/api/admin/users/${currentUserId}`, userData);
            closeModals();
            loadUsers(true); // Ricarica la tabella dall'inizio per vedere le modifiche
            alert('Utente aggiornato con successo!');
        } catch (error) {
            console.error("Errore durante l'aggiornamento:", error);
            alert('Errore: impossibile aggiornare l\'utente.');
        }
    });

    window.deleteUser = async (id) => {
        if (confirm(`Sei sicuro di voler eliminare l'utente con ID ${id}? Questa azione è irreversibile.`)) {
            try {
                await axios.delete(`/api/admin/users/${id}`);
                loadUsers(true); // Ricarica la tabella dall'inizio
                alert('Utente eliminato con successo.');
            } catch (error) {
                console.error("Errore durante l'eliminazione:", error);
                alert('Errore: impossibile eliminare l\'utente.');
            }
        }
    };

    // --- Setup Event Listeners ---

    editModal.querySelectorAll('.modal-background, .delete, .modal-card-foot .button:not(.is-success)').forEach(el => {
        el.addEventListener('click', closeModals);
    });

    roleFilterContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            roleFilterContainer.querySelector('.is-link')?.classList.remove('is-link');
            event.target.classList.add('is-link');
            filtroRuolo = event.target.dataset.filtro;
            loadUsers(true);
        }
    });

    searchInput.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        searchTerm = event.target.value;
        debounceTimer = setTimeout(() => {
            loadUsers(true);
        }, 400); // Attende 400ms prima di avviare la ricerca
    });

    mostraDiPiuBtn.addEventListener('click', () => {
        paginaCorrente++;
        loadUsers(false); // Carica la pagina successiva senza resettare
    });

    // --- Caricamento Iniziale ---
    loadUsers(true);
});