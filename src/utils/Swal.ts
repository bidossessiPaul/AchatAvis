import Swal from 'sweetalert2';

export const showSuccess = (title: string, text?: string) => {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        timer: 3000,
        timerProgressBar: true,
        confirmButtonColor: '#10b981',
    });
};

export const showError = (title: string, text?: string) => {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonColor: '#ef4444',
    });
};

export const showConfirm = (title: string, text: string) => {
    return Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Confirmer',
        cancelButtonText: 'Annuler',
    });
};

export const showInput = (title: string, text: string, placeholder: string = '') => {
    return Swal.fire({
        title,
        text,
        input: 'text',
        inputPlaceholder: placeholder,
        showCancelButton: true,
        confirmButtonText: 'Valider',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#0ea5e9',
        cancelButtonColor: '#ef4444',
    });
};

export const showSelection = (title: string, text: string, options: string[]) => {
    const inputOptions: Record<string, string> = {};
    options.forEach(opt => {
        inputOptions[opt] = opt;
    });

    return Swal.fire({
        title,
        text,
        input: 'select',
        inputOptions,
        inputPlaceholder: 'Choisir un motif...',
        showCancelButton: true,
        confirmButtonText: 'Valider',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10b981', // Green for positive action selecting
        cancelButtonColor: '#ff3b6a', // Brand red
        inputValidator: (value) => {
            return new Promise((resolve) => {
                if (value) {
                    resolve();
                } else {
                    resolve('Veuillez sélectionner un motif');
                }
            });
        }
    });
};

export const showPremiumWarningModal = (title: string, subtitle: string, reasons: string[]) => {
    let selectedReason = '';

    return Swal.fire({
        title,
        width: '600px',
        html: `
            <div style="text-align: left; margin-top: 1rem;">
                <p style="color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem;">${subtitle}</p>
                
                <label style="display: block; font-weight: 700; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.75rem; letter-spacing: 0.05em;">Motif de l'avertissement</label>
                <div class="reason-grid">
                    ${reasons.map((r, i) => `
                        <div class="reason-tile" data-reason="${r}">
                            ${r}
                        </div>
                    `).join('')}
                    <div class="reason-tile other" data-reason="OTHER">
                        Autre motif...
                    </div>
                </div>
            </div>
            <style>
                .reason-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                }
                .reason-tile {
                    padding: 0.875rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    color: #475569;
                    background: #f8fafc;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                }
                .reason-tile:hover {
                    border-color: #10b981;
                    color: #10b981;
                    background: white;
                }
                .reason-tile.selected {
                    background: #10b981;
                    border-color: #10b981;
                    color: white;
                    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
                }
                .reason-tile.other {
                    background: white;
                    border-style: dashed;
                    border-width: 2px;
                }
            </style>
        `,
        showCancelButton: true,
        confirmButtonText: 'Envoyer l\'avertissement',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ff3b6a',
        didOpen: (popup) => {
            const tiles = popup.querySelectorAll('.reason-tile');
            tiles.forEach(tile => {
                tile.addEventListener('click', () => {
                    tiles.forEach(t => t.classList.remove('selected'));
                    tile.classList.add('selected');
                    selectedReason = tile.getAttribute('data-reason') || '';
                });
            });
        },
        preConfirm: () => {
            if (!selectedReason) {
                Swal.showValidationMessage('Veuillez sélectionner un motif');
                return false;
            }
            return selectedReason;
        }
    });
};

export default Swal;
