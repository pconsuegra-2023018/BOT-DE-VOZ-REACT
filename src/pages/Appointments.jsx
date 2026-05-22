import { useEffect, useState } from 'react';
import { getBookings, cancelBooking, rescheduleBooking } from '../services/api';

const STATUS_LABEL = {
  accepted:   { label: 'Confirmada',  color: '#22c55e' },
  pending:    { label: 'Pendiente',   color: '#f59e0b' },
  cancelled:  { label: 'Cancelada',  color: '#ef4444' },
  rejected:   { label: 'Rechazada',  color: '#ef4444' },
};

function formatDate(iso, tz = 'America/Guatemala') {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: tz,
  });
}

export default function Appointments() {
  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('upcoming');
  const [error, setError]             = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // bookingId en proceso
  const [rescheduleModal, setRescheduleModal] = useState(null); // { id, currentStart }
  const [newDate, setNewDate]         = useState('');
  const [newTime, setNewTime]         = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBookings(filter);
        if (cancelled) return;
        if (data.status === 'no_calendar') {
          setError('El calendario no está configurado. Configúralo en el onboarding.');
        } else {
          setBookings(data.bookings || []);
        }
      } catch {
        if (!cancelled) setError('Error al cargar las citas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [filter]);

  async function handleCancel(bookingUid) {
    if (!confirm('¿Confirmas que deseas cancelar esta cita?')) return;
    setActionLoading(bookingUid);
    const res = await cancelBooking(bookingUid);
    setActionLoading(null);
    if (res.status === 'success') {
      setBookings(prev => prev.filter(b => b.id !== bookingUid));
    } else {
      alert('No se pudo cancelar la cita. Intenta de nuevo.');
    }
  }

  async function handleReschedule() {
    if (!newDate || !newTime) return;
    setActionLoading(rescheduleModal.id);
    const res = await rescheduleBooking(rescheduleModal.id, newDate, newTime);
    setActionLoading(null);
    if (res.status === 'success') {
      setRescheduleModal(null);
      setNewDate(''); setNewTime('');
      // Recargar citas
      const data = await getBookings(filter);
      setBookings(data.bookings || []);
    } else {
      alert('No se pudo reprogramar la cita. Intenta de nuevo.');
    }
  }

  return (
    <div className="appointments-page">
      <div className="appointments-header">
        <div>
          <h1 className="appointments-title">Citas agendadas</h1>
          <p className="appointments-subtitle">Reservas creadas a través del agente de voz</p>
        </div>
        <div className="appointments-filters">
          {['upcoming', 'recurring', 'past', 'cancelled'].map(s => (
            <button
              key={s}
              className={`filter-btn ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {{ upcoming: 'Próximas', recurring: 'Recurrentes', past: 'Pasadas', cancelled: 'Canceladas' }[s]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="appointments-empty">
          <div className="appt-spinner" />
          <p>Cargando citas...</p>
        </div>
      )}

      {!loading && error && (
        <div className="appointments-empty">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="appointments-empty">
          <span style={{ fontSize: '2.5rem' }}>📅</span>
          <p>No hay citas {filter === 'upcoming' ? 'próximas' : filter === 'past' ? 'pasadas' : 'en esta categoría'}.</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="appointments-list">
          {bookings.map(b => {
            const st = STATUS_LABEL[b.status] || { label: b.status, color: '#94a3b8' };
            return (
              <div key={b.id} className="appt-card">
                <div className="appt-card-left">
                  <div className="appt-date">{formatDate(b.start, b.timeZone || 'America/Guatemala')}</div>
                  <div className="appt-name">{b.attendee?.name || 'Cliente'}</div>
                  {b.attendee?.email && (
                    <div className="appt-email">{b.attendee.email}</div>
                  )}
                  {b.service && (
                    <div className="appt-service">🔧 {b.service}</div>
                  )}
                </div>
                <div className="appt-card-right">
                  <span className="appt-status" style={{ background: st.color + '22', color: st.color, border: `1px solid ${st.color}55` }}>
                    {st.label}
                  </span>
                  <div className="appt-duration">⏱ {b.duration} min</div>
                  {b.meetingUrl && (
                    <a href={b.meetingUrl} target="_blank" rel="noreferrer" className="appt-link">
                      🔗 Ver enlace
                    </a>
                  )}
                  {b.status !== 'cancelled' && b.status !== 'rejected' && (
                    <div className="appt-actions">
                      <button
                        className="appt-btn appt-btn-reschedule"
                        disabled={actionLoading === b.id}
                        onClick={() => { setRescheduleModal({ id: b.id, currentStart: b.start }); setNewDate(b.start?.slice(0,10) || ''); setNewTime(b.start?.slice(11,16) || ''); }}
                      >✏️ Reprogramar</button>
                      <button
                        className="appt-btn appt-btn-cancel"
                        disabled={actionLoading === b.id}
                        onClick={() => handleCancel(b.id)}
                      >{actionLoading === b.id ? '...' : '✕ Cancelar'}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Reprogramar cita</h3>
            <p className="modal-subtitle">Actual: {formatDate(rescheduleModal.currentStart)}</p>
            <div className="modal-field">
              <label>Nueva fecha</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="modal-input" />
            </div>
            <div className="modal-field">
              <label>Nueva hora</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="modal-input" />
            </div>
            <div className="modal-actions">
              <button className="appt-btn appt-btn-reschedule" disabled={actionLoading === rescheduleModal.id || !newDate || !newTime} onClick={handleReschedule}>
                {actionLoading === rescheduleModal.id ? 'Guardando...' : '✅ Confirmar'}
              </button>
              <button className="appt-btn appt-btn-cancel" onClick={() => setRescheduleModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
