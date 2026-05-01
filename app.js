// =========================================================
// PORTAL WELLNESS JS — PRODUCCIÓN Y DESARROLLO
// =========================================================

// Usamos tu lógica exacta para detectar el entorno
const API_BASE = window.ENV_API_BASE || "https://kont-backend-final.onrender.com/api";

// Y creamos la constante específica para este portal
const PUBLIC_API_URL = `${API_BASE}/public`; 

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('t');

    if (!token) {
        showError("Enlace inválido. Pídele a tu centro un nuevo enlace de acceso.");
        return;
    }

    try {
        // Hacemos el fetch usando tu URL dinámica
        const response = await fetch(`${PUBLIC_API_URL}/wellness/portal/${token}`);
        const result = await response.json();

        if (!response.ok || !result.data) {
            throw new Error(result.error || "No se pudo cargar tu información.");
        }

        renderWellnessPortal(result.data);

    } catch (error) {
        showError(error.message);
    }
});

// ... (aquí sigue tu función renderWellnessPortal)

function renderWellnessPortal(data) {
    // ── 1. HEADER Y MARCA ──
    document.getElementById('tenant-name').textContent = data.tenant.name;
    document.getElementById('tenant-category').textContent = data.tenant.category;
    document.getElementById('client-name').textContent = data.client.name;

    // Inyectar el color primario de la empresa (Marca Blanca)
    if(data.tenant.brandColor && data.tenant.brandColor.length === 7) {
        document.documentElement.style.setProperty('--kont-dark', data.tenant.brandColor);
    }

    if (data.tenant.logoUrl) {
        document.getElementById('tenant-logo').src = data.tenant.logoUrl;
        document.getElementById('tenant-logo').classList.remove('hidden');
        document.getElementById('tenant-initial').classList.add('hidden');
    } else {
        document.getElementById('tenant-initial').textContent = data.tenant.name.charAt(0);
    }

    // ── 2. PLAN Y GRÁFICO ──
    document.getElementById('plan-name').textContent = data.package.name;
    
    // Tratamiento seguro de fecha (evita el desfase horario)
    const expiry = new Date(data.package.expiryDate);
    expiry.setMinutes(expiry.getMinutes() + expiry.getTimezoneOffset());
    document.getElementById('plan-expiry').textContent = expiry.toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' });

    let progressText = "0";
    let progressUnit = "Left";
    let percentage = 0;

    if (data.package.type === 'SESSIONS') {
        const left = data.package.totalSessions - data.package.usedSessions;
        progressText = left;
        progressUnit = "Clases";
        percentage = left / data.package.totalSessions;
    } else {
        const diff = expiry.getTime() - new Date().getTime();
        const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
        progressText = daysLeft > 0 ? daysLeft : 0;
        progressUnit = "Días";
        percentage = daysLeft > 0 ? (daysLeft / 30) : 0;
        if(percentage > 1) percentage = 1;
    }

    document.getElementById('progress-value').textContent = progressText;
    document.getElementById('progress-unit').textContent = progressUnit;

    setTimeout(() => {
        const circle = document.getElementById('progress-circle');
        const offset = 251.2 - (percentage * 251.2);
        if (circle) circle.style.strokeDashoffset = offset;
    }, 300);

    // ── 3. TARJETA DE ACCIÓN (La Próxima Cita) ──
    const actionCard = document.getElementById('action-card');
    
    if (data.nextAppointment) {
        const aptDate = new Date(data.nextAppointment.date);
        const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        
        // Ajuste inteligente del botón
        let btnIcon = 'bi-calendar-check';
        let btnText = 'Confirmar Asistencia';
        
        if (data.tenant.category.toLowerCase().includes('belleza') || data.tenant.category.toLowerCase().includes('spa')) {
            btnText = 'Confirmar Cita';
        }

        actionCard.innerHTML = `
            <div class="action-content">
                <div class="flex items-center gap-4">
                    <div class="action-date-box">
                        <span class="action-day">${days[aptDate.getDay()]}</span>
                        <span class="action-num">${String(aptDate.getDate()).padStart(2, '0')}</span>
                    </div>
                    <div>
                        <h3 class="text-[17px] font-bold leading-tight">${data.nextAppointment.service}</h3>
                        <p class="text-xs text-slate-400 font-medium mt-1"><i class="bi bi-clock mr-1"></i> ${aptDate.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                </div>
                <button class="kont-btn-action" onclick="confirmAttendance(${data.nextAppointment.id})">
                    <i class="bi ${btnIcon} text-lg"></i> ${btnText}
                </button>
            </div>
        `;
    } else {
        actionCard.innerHTML = `
            <div class="text-center py-6 action-content">
                <i class="bi bi-calendar2-x text-3xl text-slate-500 mb-2 inline-block"></i>
                <p class="text-sm font-bold text-slate-300">No tienes agendamientos futuros.</p>
            </div>
        `;
    }

    // ── 4. CRONOGRAMA / HISTORIAL ──
    const agendaList = document.getElementById('agenda-list');
    
    if(data.upcoming.length > 0) {
        agendaList.innerHTML = data.upcoming.map(apt => {
            const date = new Date(apt.date);
            const statusClass = apt.status === 'CONFIRMADA' ? 'status-ok' : 'status-wait';
            
            return `
            <div class="agenda-item shadow-sm">
                <div class="flex items-center gap-4">
                    <div class="agenda-date-sm">${date.getDate()}</div>
                    <div>
                        <p class="font-bold text-slate-800 text-[13px]">${apt.service}</p>
                        <p class="text-[11px] text-slate-500 font-semibold mt-1">
                            ${date.toLocaleDateString('es-VE', { month: 'short' })} • ${date.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${apt.status}</span>
            </div>`;
        }).join('');
    } else {
        agendaList.innerHTML = `<p class="text-xs text-slate-400 font-medium px-2 italic">Sin clases programadas.</p>`;
    }
}

// Interacción del Botón
window.confirmAttendance = async function(appointmentId) {
    alert("¡Aquí enviaremos un POST a tu API para marcar la cita como CONFIRMADA!");
    // await fetch(`${API_BASE_URL}/wellness/confirm`, { method: 'POST', body: JSON.stringify({ id: appointmentId }) });
}

function showError(msg) {
    document.querySelector('.kont-app').innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-100">
            <div class="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-200">
                <i class="bi bi-exclamation-triangle-fill text-5xl text-rose-500 mb-4 inline-block drop-shadow-sm"></i>
                <h2 class="text-xl font-black text-slate-800 mb-2">Acceso Denegado</h2>
                <p class="text-sm text-slate-500 font-medium">${msg}</p>
            </div>
        </div>`;
}