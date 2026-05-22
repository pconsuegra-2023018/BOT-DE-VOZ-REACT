import { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  FaBuilding, FaClock, FaList, FaCalendarCheck,
  FaRobot, FaCheck, FaPlus, FaTrash, FaSpinner,
  FaChevronRight, FaChevronLeft, FaBrain,
} from 'react-icons/fa6';
import toast from 'react-hot-toast';
import { setupOnboarding } from '../services/api';

/* ─── Constantes ─── */
const DAYS = [
  { key: 'monday',    label: 'Lunes' },
  { key: 'tuesday',   label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday',  label: 'Jueves' },
  { key: 'friday',    label: 'Viernes' },
  { key: 'saturday',  label: 'Sábado' },
  { key: 'sunday',    label: 'Domingo' },
];

const BUSINESS_TYPES = [
  { value: 'clinica',      label: '🏥 Clínica / Consultorio' },
  { value: 'gym',          label: '💪 Gym / Fitness' },
  { value: 'salon',        label: '💇 Salón de Belleza' },
  { value: 'restaurante',  label: '🍽️ Restaurante' },
  { value: 'dental',       label: '🦷 Clínica Dental' },
  { value: 'spa',          label: '🧘 Spa / Bienestar' },
  { value: 'abogado',      label: '⚖️ Despacho Legal' },
  { value: 'otro',         label: '🏢 Otro' },
];

const TIMEZONES = [
  'America/Guatemala',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
];

const STEPS = [
  { id: 0, label: 'Bienvenida',  Icon: FaBrain },
  { id: 1, label: 'Negocio',    Icon: FaBuilding },
  { id: 2, label: 'Horarios',   Icon: FaClock },
  { id: 3, label: 'Servicios',  Icon: FaList },
  { id: 4, label: 'Citas',      Icon: FaCalendarCheck },
  { id: 5, label: 'Agente',     Icon: FaRobot },
];

/* ─── Estado inicial del formulario ─── */
const initialSchedule = {
  monday:    { open: '08:00', close: '18:00' },
  tuesday:   { open: '08:00', close: '18:00' },
  wednesday: { open: '08:00', close: '18:00' },
  thursday:  { open: '08:00', close: '18:00' },
  friday:    { open: '08:00', close: '17:00' },
  saturday:  null,
  sunday:    null,
};

const initialForm = {
  business_name: '',
  business_type: '',
  city: '',
  timezone: 'America/Guatemala',
  phone: '',
  schedule: initialSchedule,
  services: [{ name: '', price: '', duration_min: '30' }],
  has_products: false,
  products: [],
  uses_calendar: false,
  cal_com_api_key: '',
  agent_name: '',
  agent_tone: 'amigable',
  agent_language: 'es',
};

/* ─── Step 0: Bienvenida ─── */
function StepWelcome() {
  return (
    <div className="wizard-welcome">
      <div className="wizard-welcome-icon">
        <FaBrain size={36} className="text-cyan-400" />
      </div>
      <h2 className="wizard-welcome-title">Bienvenido a Claudia</h2>
      <p className="wizard-welcome-sub">
        Vamos a configurar tu agente de voz inteligente en menos de 5 minutos.
        Te haré algunas preguntas sobre tu negocio y con eso crearé automáticamente
        la base de conocimiento que usará tu agente al contestar llamadas.
      </p>
      <div className="wizard-welcome-steps">
        {['Cuéntame sobre tu negocio', 'Define tus horarios', 'Configura servicios y citas', 'Personaliza tu agente'].map((s, i) => (
          <div key={i} className="wizard-welcome-step">
            <span className="wizard-welcome-step-num">{i + 1}</span>
            <span className="wizard-welcome-step-text">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 1: Identidad del negocio ─── */
function StepBusiness({ form, setForm }) {
  return (
    <div className="wizard-fields">
      <h3 className="wizard-step-title">¿Cómo es tu negocio?</h3>

      <div className="field-group">
        <label className="field-label">Nombre del negocio *</label>
        <input
          className="field-input"
          placeholder="Ej: Clínica Dental Pérez"
          value={form.business_name}
          onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
        />
      </div>

      <div className="field-group">
        <label className="field-label">Tipo de negocio *</label>
        <div className="wizard-type-grid">
          {BUSINESS_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm(p => ({ ...p, business_type: value, business_type_custom: '' }))}
              className={`wizard-type-btn ${form.business_type === value ? 'wizard-type-btn--active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        {form.business_type === 'otro' && (
          <input
            className="field-input mt-2"
            placeholder="Describe tu tipo de negocio…"
            value={form.business_type_custom || ''}
            onChange={e => setForm(p => ({ ...p, business_type_custom: e.target.value }))}
            autoFocus
          />
        )}
      </div>

      <div className="wizard-row">
        <div className="field-group">
          <label className="field-label">Ciudad *</label>
          <input
            className="field-input"
            placeholder="Ej: Ciudad de Guatemala"
            value={form.city}
            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
          />
        </div>
        <div className="field-group">
          <label className="field-label">Zona horaria</label>
          <select
            className="field-input"
            value={form.timezone}
            onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace('America/', '')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Teléfono de contacto</label>
        <input
          className="field-input"
          placeholder="Ej: +502 1234 5678"
          value={form.phone}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        />
      </div>
    </div>
  );
}

/* ─── Step 2: Horarios ─── */
function StepSchedule({ form, setForm }) {
  const toggle = (key) => {
    setForm(p => ({
      ...p,
      schedule: {
        ...p.schedule,
        [key]: p.schedule[key] ? null : { open: '08:00', close: '18:00' },
      },
    }));
  };

  const update = (key, field, val) => {
    setForm(p => ({
      ...p,
      schedule: {
        ...p.schedule,
        [key]: { ...p.schedule[key], [field]: val },
      },
    }));
  };

  return (
    <div className="wizard-fields">
      <h3 className="wizard-step-title">¿En qué horario atienden?</h3>
      <p className="wizard-step-sub">Activa los días que trabajas y configura el horario de cada uno.</p>

      <div className="wizard-schedule">
        {DAYS.map(({ key, label }) => {
          const active = !!form.schedule[key];
          return (
            <div key={key} className={`wizard-day-row ${active ? 'wizard-day-row--active' : ''}`}>
              <button
                type="button"
                onClick={() => toggle(key)}
                className={`wizard-day-toggle ${active ? 'wizard-day-toggle--on' : ''}`}
              >
                <span className="wizard-day-check">{active ? <FaCheck size={9} /> : null}</span>
                <span className="wizard-day-label">{label}</span>
              </button>

              {active && (
                <div className="wizard-day-times">
                  <input
                    type="time"
                    className="field-input wizard-time-input"
                    value={form.schedule[key].open}
                    onChange={e => update(key, 'open', e.target.value)}
                  />
                  <span className="wizard-time-sep">—</span>
                  <input
                    type="time"
                    className="field-input wizard-time-input"
                    value={form.schedule[key].close}
                    onChange={e => update(key, 'close', e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 3: Servicios ─── */
function StepServices({ form, setForm }) {
  const addService = () => {
    setForm(p => ({ ...p, services: [...p.services, { name: '', price: '', duration_min: '30' }] }));
  };

  const removeService = (i) => {
    setForm(p => ({ ...p, services: p.services.filter((_, idx) => idx !== i) }));
  };

  const updateService = (i, field, val) => {
    setForm(p => ({
      ...p,
      services: p.services.map((s, idx) => idx === i ? { ...s, [field]: val } : s),
    }));
  };

  return (
    <div className="wizard-fields">
      <h3 className="wizard-step-title">¿Qué servicios ofreces?</h3>
      <p className="wizard-step-sub">Agrega tus servicios con precio y duración aproximada.</p>

      <div className="space-y-3">
        {form.services.map((svc, i) => (
          <div key={i} className="wizard-service-row">
            <input
              className="field-input flex-1"
              placeholder="Nombre del servicio"
              value={svc.name}
              onChange={e => updateService(i, 'name', e.target.value)}
            />
            <input
              className="field-input wizard-service-price"
              placeholder="Precio"
              type="number"
              min="0"
              value={svc.price}
              onChange={e => updateService(i, 'price', e.target.value)}
            />
            <select
              className="field-input wizard-service-dur"
              value={svc.duration_min}
              onChange={e => updateService(i, 'duration_min', e.target.value)}
            >
              {['15','30','45','60','90','120'].map(d => (
                <option key={d} value={d}>{d} min</option>
              ))}
            </select>
            {form.services.length > 1 && (
              <button type="button" onClick={() => removeService(i)} className="wizard-remove-btn">
                <FaTrash size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addService} className="wizard-add-btn">
        <FaPlus size={10} /> Agregar servicio
      </button>

      <div className="wizard-toggle-row">
        <div>
          <p className="field-label">¿Vendes productos físicos?</p>
          <p className="wizard-toggle-sub">Suplementos, mercancía, equipamiento, etc.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, has_products: !p.has_products }))}
          className={`wizard-toggle ${form.has_products ? 'wizard-toggle--on' : ''}`}
        >
          <span className="wizard-toggle-thumb" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Citas ─── */
function StepAppointments({ form, setForm }) {
  return (
    <div className="wizard-fields">
      <h3 className="wizard-step-title">¿Manejas citas o reservaciones?</h3>
      <p className="wizard-step-sub">Si activas esto, el agente podrá agendar citas en tiempo real durante las llamadas.</p>

      <div className="wizard-toggle-row wizard-toggle-row--big">
        <div>
          <p className="field-label">Agendar citas por teléfono</p>
          <p className="wizard-toggle-sub">El agente consultará disponibilidad real antes de confirmar.</p>
        </div>
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, uses_calendar: !p.uses_calendar }))}
          className={`wizard-toggle ${form.uses_calendar ? 'wizard-toggle--on' : ''}`}
        >
          <span className="wizard-toggle-thumb" />
        </button>
      </div>

      {form.uses_calendar && (
        <Motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="field-group"
        >
          <label className="field-label">API Key de Cal.com *</label>
          <input
            className="field-input font-mono text-sm"
            placeholder="cal_live_xxxxxxxxxxxx"
            value={form.cal_com_api_key}
            onChange={e => setForm(p => ({ ...p, cal_com_api_key: e.target.value }))}
          />
          <p className="wizard-field-hint">
            Encuéntrala en Cal.com → Settings → Developer → API Keys
          </p>
        </Motion.div>
      )}

      {!form.uses_calendar && (
        <div className="wizard-info-box">
          <p>
            Sin citas activadas, el agente informará a los clientes que deben visitarte
            directamente durante tu horario de atención. Puedes activarlo después.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Step 5: Personalidad del agente ─── */
function StepAgent({ form, setForm }) {
  return (
    <div className="wizard-fields">
      <h3 className="wizard-step-title">¿Cómo será tu agente?</h3>
      <p className="wizard-step-sub">Define la personalidad de tu recepcionista virtual.</p>

      <div className="field-group">
        <label className="field-label">Nombre del agente *</label>
        <input
          className="field-input"
          placeholder="Ej: Sofía, Carlos, Luna…"
          value={form.agent_name}
          onChange={e => setForm(p => ({ ...p, agent_name: e.target.value }))}
        />
      </div>

      <div className="field-group">
        <label className="field-label">Tono de comunicación</label>
        <div className="wizard-tone-grid">
          {[
            { value: 'amigable',  label: '😊 Amigable', desc: 'Cálido y cercano' },
            { value: 'formal',    label: '👔 Formal',    desc: 'Profesional y directo' },
            { value: 'entusiasta',label: '🎉 Entusiasta',desc: 'Energético y positivo' },
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm(p => ({ ...p, agent_tone: value }))}
              className={`wizard-tone-btn ${form.agent_tone === value ? 'wizard-tone-btn--active' : ''}`}
            >
              <span className="wizard-tone-label">{label}</span>
              <span className="wizard-tone-desc">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Idioma</label>
        <div className="wizard-row">
          {[
            { value: 'es', label: '🇪🇸 Español' },
            { value: 'en', label: '🇺🇸 English' },
            { value: 'both', label: '🌎 Ambos' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm(p => ({ ...p, agent_language: value }))}
              className={`wizard-lang-btn ${form.agent_language === value ? 'wizard-lang-btn--active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {form.agent_name && (
        <div className="wizard-preview">
          <p className="wizard-preview-label">Vista previa del saludo:</p>
          <p className="wizard-preview-text">
            "Hola, soy <strong>{form.agent_name}</strong>, recepcionista virtual de{' '}
            <strong>{form.business_name || 'tu negocio'}</strong>. ¿En qué te puedo ayudar hoy?"
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Pantalla de progreso ─── */
function StepCreating({ progress, currentKB }) {
  return (
    <div className="wizard-creating">
      <div className="wizard-creating-icon">
        <FaSpinner size={30} className="text-cyan-400 animate-spin" />
      </div>
      <h3 className="wizard-step-title">Creando tu agente…</h3>
      <p className="wizard-step-sub">
        Estoy generando el conocimiento de tu negocio y configurando Retell AI.
        Esto puede tardar hasta 1 minuto.
      </p>
      <div className="wizard-progress-bar-wrap">
        <div className="wizard-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="wizard-progress-label">{progress}% — {currentKB}</p>
    </div>
  );
}

/* ─── Pantalla de éxito ─── */
function StepDone({ businessName, onFinish }) {
  return (
    <div className="wizard-done">
      <div className="wizard-done-icon">
        <FaCheck size={30} className="text-emerald-400" />
      </div>
      <h3 className="wizard-step-title">¡Listo, {businessName}!</h3>
      <p className="wizard-step-sub">
        Tu agente de voz ha sido configurado exitosamente. La base de conocimiento
        está lista y conectada a Retell AI.
      </p>
      <button onClick={onFinish} className="btn-primary w-full justify-center mt-2">
        Ir al panel principal
      </button>
    </div>
  );
}

/* ─── Wizard principal ─── */
export default function OnboardingWizard({ onComplete }) {
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(initialForm);
  const [creating, setCreating]   = useState(false);
  const [done, setDone]           = useState(false);
  const [progress, setProgress]   = useState(0);
  const [currentKB, setCurrentKB] = useState('Iniciando…');

  const isLastFormStep = step === STEPS.length - 1;

  /* Validación por step */
  const isValid = () => {
    if (step === 1) return (
      form.business_name.trim().length >= 2 &&
      !!form.business_type &&
      form.city.trim().length >= 2 &&
      (form.business_type !== 'otro' || (form.business_type_custom || '').trim().length >= 2)
    );
    if (step === 2) return Object.values(form.schedule).some(Boolean);
    if (step === 3) return form.services.some(s => s.name.trim());
    if (step === 4) return !form.uses_calendar || form.cal_com_api_key.trim().length > 5;
    if (step === 5) return form.agent_name.trim().length >= 2;
    return true;
  };

  const simulateProgress = () => {
    const messages = [
      'Generando identidad del negocio…',
      'Creando horarios de atención…',
      'Procesando servicios y tarifas…',
      'Configurando políticas de citas…',
      'Generando preguntas frecuentes…',
      'Subiendo base de conocimiento a Retell AI…',
      'Conectando con el agente…',
      'Finalizando configuración…',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setProgress(Math.min(Math.round((i / messages.length) * 90), 90));
      setCurrentKB(messages[Math.min(i, messages.length - 1)]);
      if (i >= messages.length) clearInterval(interval);
    }, 1200);
    return interval;
  };

  const handleFinish = async () => {
    setCreating(true);
    const interval = simulateProgress();

    const payload = {
      ...form,
      services: form.services.filter(s => s.name.trim()),
    };

    const r = await setupOnboarding(payload);
    clearInterval(interval);

    if (r.error) {
      setCreating(false);
      toast.error(`Error al configurar: ${r.message}`);
      return;
    }

    setProgress(100);
    setCurrentKB('¡Completado!');
    setTimeout(() => setDone(true), 600);
  };

  const next = () => {
    if (isLastFormStep) { handleFinish(); return; }
    setStep(p => p + 1);
  };

  const back = () => setStep(p => p - 1);

  /* Render pantallas especiales */
  if (creating && !done) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-box">
          <StepCreating progress={progress} currentKB={currentKB} />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="wizard-overlay">
        <div className="wizard-box">
          <StepDone businessName={form.business_name} onFinish={onComplete} />
        </div>
      </div>
    );
  }

  const stepComponents = [
    <StepWelcome />,
    <StepBusiness form={form} setForm={setForm} />,
    <StepSchedule form={form} setForm={setForm} />,
    <StepServices form={form} setForm={setForm} />,
    <StepAppointments form={form} setForm={setForm} />,
    <StepAgent form={form} setForm={setForm} />,
  ];

  return (
    <div className="wizard-overlay">
      <div className="wizard-box">
        {/* Progress dots */}
        <div className="wizard-dots">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`wizard-dot ${i === step ? 'wizard-dot--active' : i < step ? 'wizard-dot--done' : ''}`}
              title={s.label}
            >
              {i < step ? <FaCheck size={7} /> : null}
            </div>
          ))}
        </div>

        {/* Step label */}
        <p className="wizard-step-label">
          {step === 0 ? 'Inicio' : `Paso ${step} de ${STEPS.length - 1} — ${STEPS[step].label}`}
        </p>

        {/* Content */}
        <AnimatePresence mode="wait">
          <Motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="wizard-content"
          >
            {stepComponents[step]}
          </Motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="wizard-nav">
          {step > 0 && (
            <button onClick={back} className="btn-ghost flex items-center gap-2">
              <FaChevronLeft size={11} /> Atrás
            </button>
          )}
          <button
            onClick={next}
            disabled={!isValid()}
            className="btn-primary ml-auto flex items-center gap-2"
          >
            {isLastFormStep ? (
              <><FaBrain size={12} /> Crear mi agente</>
            ) : step === 0 ? (
              <>Comenzar <FaChevronRight size={11} /></>
            ) : (
              <>Siguiente <FaChevronRight size={11} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
