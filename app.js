// =========================================================
// PORTAL WELLNESS JS — MEJORAS PARTE 8
// =========================================================

const API_BASE = window.ENV_API_BASE || "https://kont-backend-final.onrender.com/api";
const PUBLIC_API_URL = `${API_BASE}/public`; 

// Escudo Anti-XSS
function safeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('t');

    if (!token) {
        showError("Enlace inválido. Pídele a tu centro un nuevo enlace de acceso.");
        return;
    }

    try {
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

function renderWellnessPortal(data) {
    // ── 1. HEADER Y MARCA ──
    document.getElementById('tenant-name').textContent = data.tenant.name;
    document.getElementById('tenant-category').textContent = data.tenant.category;
    document.getElementById('client-name').textContent = data.client.name.split(" ")[0];

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

    // ── MEJORA 1: BANNER DE RECORDATORIO DE PAGO ──
    const bannerContainer = document.getElementById("billing-banner-container");
    if (bannerContainer && data.reminder) {
        const isVencido = data.reminder.type === 'VENCIDO';
        
        const bgColor = isVencido ? '#fef2f2' : '#fffbeb';
        const borderColor = isVencido ? '#fecaca' : '#fde68a';
        const textColor = isVencido ? '#991b1b' : '#92400e';
        const icon = isVencido ? 'bi-exclamation-octagon-fill' : 'bi-bell-fill';
        
        const contactBtn = data.tenant.phone 
            ? `href="https://wa.me/${data.tenant.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, necesito ayuda para pagar mi plan.')}" target="_blank"`
            : `href="#" onclick="alert('Contacta a la recepción del centro.')"`;

        const btnHtml = data.payment_link 
            ? `<a href="${data.payment_link}" style="background: ${textColor}; color: white; text-align: center; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 800; display: block; margin-top: 8px; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Realizar Pago Seguro</a>`
            : `<a ${contactBtn} style="background: white; color: ${textColor}; text-align: center; padding: 10px; border-radius: 10px; text-decoration: none; font-weight: 800; display: block; margin-top: 8px; border: 1px solid ${borderColor};">Contactar al Gym</a>`;

        bannerContainer.innerHTML = `
            <div style="background: ${bgColor}; border: 1px solid ${borderColor}; padding: 15px 20px; border-radius: 16px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <i class="bi ${icon}" style="font-size: 1.8rem; color: ${textColor}; line-height: 1;"></i>
                    <div>
                        <h4 style="margin: 0; color: ${textColor}; font-weight: 900; font-size: 1.1rem; line-height: 1.2;">${safeHtml(data.reminder.title)}</h4>
                        <p style="margin: 4px 0 0 0; color: ${textColor}; font-size: 0.85rem; font-weight: 600;">${safeHtml(data.reminder.message)}</p>
                    </div>
                </div>
                ${btnHtml}
            </div>
        `;
        bannerContainer.style.display = 'block';
    }

    // ── MEJORA 2: PLAN Y GRÁFICO (BARRA DE PROGRESO) ──
    document.getElementById('plan-name').textContent = data.package.name;
    
    const expiry = new Date(data.package.expiryDate);
    expiry.setMinutes(expiry.getMinutes() + expiry.getTimezoneOffset());
    document.getElementById('plan-expiry').textContent = expiry.toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' });

    let progressText = "0";
    let progressUnit = "Left";
    let percentage = 0;

    const barContainer = document.getElementById('progress-bar-container');
    const barText = document.getElementById('progress-bar-text');
    const barFill = document.getElementById('progress-bar-fill');

    if (data.package.type === 'SESSIONS') {
        const left = data.package.totalSessions - data.package.usedSessions;
        progressText = left;
        progressUnit = "Clases";
        percentage = left / data.package.totalSessions;

        // Mostrar barra lineal
        barContainer.style.display = 'block';
        barText.textContent = `${data.package.usedSessions} de ${data.package.totalSessions} sesiones usadas — ${left} restantes`;
        barFill.style.width = `${(data.package.usedSessions / data.package.totalSessions) * 100}%`;

    } else {
        const diff = expiry.getTime() - new Date().getTime();
        const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
        progressText = daysLeft > 0 ? daysLeft : 0;
        progressUnit = "Días";
        percentage = daysLeft > 0 ? (daysLeft / 30) : 0;
        if(percentage > 1) percentage = 1;

        // Mostrar texto ilimitado
        barContainer.style.display = 'block';
        barText.innerHTML = `<i class="bi bi-infinity" style="font-size:1.1rem; color:var(--kont-blue); vertical-align:-2px;"></i> Acceso Ilimitado hasta el corte`;
        barFill.style.width = `100%`;
    }

    document.getElementById('progress-value').textContent = progressText;
    document.getElementById('progress-unit').textContent = progressUnit;

    setTimeout(() => {
        const circle = document.getElementById('progress-circle');
        const offset = 251.2 - (percentage * 251.2);
        if (circle) circle.style.strokeDashoffset = offset;
    }, 300);

    // ── MEJORA 4: TARJETA DE ACCIÓN COMPLETA ──
    const actionCard = document.getElementById('action-card');
    
    if (data.nextAppointment) {
        const aptDate = new Date(data.nextAppointment.date);
        const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        
        let btnIcon = 'bi-calendar-check';
        let btnText = 'Confirmar Asistencia';
        
        if (data.tenant.category.toLowerCase().includes('belleza') || data.tenant.category.toLowerCase().includes('spa')) {
            btnText = 'Confirmar Cita';
        }

        actionCard.innerHTML = `
            <div class="action-content">
                <div class="flex items-center gap-4">
                    <div class="action-date-box" style="background: white; border:none; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                        <span class="action-day" style="color: var(--kont-dark);">${days[aptDate.getDay()]}</span>
                        <span class="action-num" style="color: var(--kont-dark);">${String(aptDate.getDate()).padStart(2, '0')}</span>
                    </div>
                    <div>
                        <h3 class="text-[18px] font-bold leading-tight mb-1 text-white">${safeHtml(data.nextAppointment.service)}</h3>
                        <p class="text-[13px] text-slate-300 font-semibold"><i class="bi bi-person-badge mr-1"></i> Prof. Asignado</p>
                        <p class="text-xs text-emerald-300 font-bold mt-1"><i class="bi bi-clock-fill mr-1"></i> ${aptDate.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                </div>
                <button id="btn-confirm-${data.nextAppointment.id}" class="kont-btn-action" onclick="confirmarAsistencia(${data.nextAppointment.id})" style="margin-top: 25px;">
                    <i class="bi ${btnIcon} text-lg"></i> ${btnText}
                </button>
            </div>
        `;
    } else {
        actionCard.innerHTML = `
            <div class="text-center py-6 action-content">
                <i class="bi bi-calendar2-x text-3xl text-slate-400 mb-2 inline-block"></i>
                <p class="text-sm font-bold text-slate-300">No tienes agendamientos futuros.</p>
                <button class="w-full mt-4 bg-white/10 text-white py-3 rounded-xl font-bold hover:bg-white/20 transition-all text-sm">
                    <i class="bi bi-calendar-plus mr-1"></i> Ver todas las clases
                </button>
            </div>
        `;
    }

    // ── CRONOGRAMA ──
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
                        <p class="font-bold text-slate-800 text-[13px]">${safeHtml(apt.service)}</p>
                        <p class="text-[11px] text-slate-500 font-semibold mt-1">
                            ${date.toLocaleDateString('es-VE', { month: 'short' })} • ${date.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">${safeHtml(apt.status)}</span>
            </div>`;
        }).join('');
    } else {
        agendaList.innerHTML = `<p class="text-xs text-slate-400 font-medium px-2 italic">Sin clases programadas.</p>`;
    }

    // ── MEJORA 3: HISTORIAL DE PAGOS ──
    // Asumiendo que el backend ahora envía data.payment_history (un array de los últimos pagos)
    if (data.payment_history && data.payment_history.length > 0) {
        document.getElementById('payments-section').style.display = 'block';
        const historyContainer = document.getElementById('payments-history');
        
        historyContainer.innerHTML = data.payment_history.map(p => {
            const isPending = p.status === 'SUBMITTED' || p.status === 'PENDING';
            const icon = isPending ? 'bi-hourglass-split text-amber-500' : 'bi-check-circle-fill text-emerald-500';
            const statusText = isPending ? 'En Revisión' : 'Verificado';
            const date = new Date(p.date || p.submitted_at).toLocaleDateString('es-VE', {day:'2-digit', month:'short'});
            
            return `
            <div class="agenda-item shadow-sm py-3" style="padding-top: 12px; padding-bottom: 12px;">
                <div class="flex items-center gap-3">
                    <i class="bi ${icon} text-[20px]"></i>
                    <div>
                        <p class="font-bold text-slate-800 text-[14px]">$${Number(p.amount_usd).toFixed(2)} USD</p>
                        <p class="text-[11px] text-slate-500 font-semibold mt-0.5">${safeHtml(p.payment_method)} • ${date}</p>
                    </div>
                </div>
                <span style="font-size: 10px; font-weight: 800; color: ${isPending ? '#b45309' : '#059669'}; background: ${isPending ? '#fef3c7' : '#dcfce7'}; padding: 4px 8px; border-radius: 6px;">
                    ${statusText}
                </span>
            </div>`;
        }).join('');
    }

    // ── MEJORA 5: DATOS DE CONTACTO COMPLETOS EN FOOTER ──
    const contactSection = document.getElementById('contact-section');
    const footer = document.getElementById('tenant-footer');
    
    if (contactSection) {
        const phone = data.tenant.phone || ""; 
        const clientFirstName = data.client.name.split(" ")[0];
        const message = encodeURIComponent(`¡Hola! Soy ${clientFirstName}, estoy revisando mi portal y necesito ayuda.`);

        let htmlContacto = "";

        if (phone) {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            htmlContacto += `
                <a href="https://wa.me/${cleanPhone}?text=${message}" target="_blank" 
                   class="w-full bg-[#25D366] hover:bg-[#1EBE59] text-white font-extrabold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(37,211,102,0.3)] transition-transform active:scale-95 mb-4">
                    <i class="bi bi-whatsapp text-[20px]"></i> Contactar al Estudio
                </a>
            `;
        }

        // Si el backend envía más datos (Instagram, Dirección), los agregamos debajo del botón
        if (data.tenant.address || data.tenant.instagram) {
            htmlContacto += `<div class="bg-white p-4 rounded-xl border border-slate-200 mt-2">`;
            
            if (data.tenant.address) {
                htmlContacto += `<p class="text-[12px] text-slate-600 font-medium mb-2 flex gap-2"><i class="bi bi-geo-alt-fill text-slate-400"></i> ${safeHtml(data.tenant.address)}</p>`;
            }
            if (data.tenant.instagram) {
                const igClean = data.tenant.instagram.replace('@', '');
                htmlContacto += `<p class="text-[12px] text-slate-600 font-medium flex gap-2"><i class="bi bi-instagram text-slate-400"></i> <a href="https://instagram.com/${igClean}" target="_blank" class="text-indigo-600 font-bold hover:underline">@${igClean}</a></p>`;
            }
            
            htmlContacto += `</div>`;
        }

        contactSection.innerHTML = htmlContacto;
        
        // También actualizamos el footer para que sea más pro
        footer.innerHTML = `
            <div style="font-size: 11px; font-weight: 800; color: #cbd5e1; margin-bottom: 5px;">ESTE PORTAL ESTÁ PROTEGIDO POR</div>
            <p style="font-size: 15px; font-weight: 900; color: #94a3b8; letter-spacing: 0.15em;">KONT <span style="color: var(--kont-blue);">WELLNESS</span></p>
        `;
    }
}

async function confirmarAsistencia(appointmentId) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('t');

  const btn = document.getElementById(`btn-confirm-${appointmentId}`);
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Confirmando...';
  btn.disabled = true;

  try {
    const res = await fetch(`${PUBLIC_API_URL}/wellness/portal/appointments/${appointmentId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token })
    });
    const data = await res.json();

    if (data.ok) {
      btn.outerHTML = `
        <div style="color: #10b981; font-weight: 800; background: #dcfce7; padding: 12px 15px; border-radius: 12px; display: inline-flex; align-items: center; gap: 8px; margin-top: 25px; width: 100%; justify-content: center; box-shadow: 0 4px 10px rgba(16,185,129,0.1);">
          <i class="bi bi-check-circle-fill" style="font-size: 1.3rem;"></i> ¡Cita confirmada!
        </div>`;
    } else {
      alert(data.error || "Ocurrió un error al confirmar.");
      btn.innerHTML = 'Confirmar Asistencia';
      btn.disabled = false;
    }
  } catch (e) {
    alert("Error de conexión. Revisa tu internet.");
    btn.innerHTML = 'Confirmar Asistencia';
    btn.disabled = false;
  }
}

function showError(msg) {
    document.querySelector('.kont-app').innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-100">
            <div class="bg-white p-8 rounded-[24px] shadow-2xl max-w-sm w-full border border-slate-200">
                <i class="bi bi-exclamation-triangle-fill text-6xl text-rose-500 mb-4 inline-block drop-shadow-md"></i>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Acceso Denegado</h2>
                <p class="text-[15px] text-slate-500 font-medium leading-relaxed">${safeHtml(msg)}</p>
                <div class="mt-8 pt-6 border-t border-slate-100">
                    <p class="text-xs font-bold text-slate-300 tracking-widest uppercase">Powered by Kont</p>
                </div>
            </div>
        </div>`;
}
