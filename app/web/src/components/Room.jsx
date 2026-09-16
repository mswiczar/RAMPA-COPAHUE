export default function Room({ agents, selected }) {
  const ring = agents.filter((a) => a.id !== "ceo");
  const ceo = agents.find((a) => a.id === "ceo");
  const n = ring.length;
  const cx = 50, cy = 80, rx = 40, ry = 62;
  const nodes = ring.map((a, i) => {
    const ang = Math.PI - (i * Math.PI) / Math.max(1, n - 1);
    const edge = i === 0 || i === n - 1 ? -6 : 0;
    return { a, x: cx + rx * Math.cos(ang), y: cy - ry * Math.sin(ang) + edge, delay: i * 0.45 };
  });

  return (
    <section className="room" aria-label="Sala de agentes">
      <div className="room-head">
        <span className="eyebrow">La compañía piensa junto a su dirección</span>
        <p>Elegí un agente para preguntarle o encargarle algo.</p>
      </div>
      <div className="stage">
        <svg className="wires" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {nodes.map(({ a, x, y }) => (
            <line key={a.id} x1={cx} y1={cy} x2={x} y2={y} className={selected === "ceo" || selected === a.id ? "on" : ""} />
          ))}
        </svg>
        {nodes.map(({ a, x, y, delay }) => (
          <a key={a.id} href={`#/sala/${a.id}`} className="node" style={{ "--x": `${x}%`, "--y": `${y}%` }} aria-current={selected === a.id ? "true" : undefined}>
            <span className="sphere" style={{ "--d": `${delay}s` }}>
              {a.activeTasks > 0 && <span className="working" title="Trabajando" />}
            </span>
            <span className="node-text">
              <span className="node-name">{a.short}</span>
              <span className="node-state">
                {a.pendingApprovals > 0 ? <b className="warn">{a.pendingApprovals} por aprobar</b>
                  : a.activeTasks > 0 ? <b className="live">trabajando</b>
                  : <>{a.alerts.length} alertas</>}
              </span>
            </span>
          </a>
        ))}
        {ceo && (
          <a href="#/sala/ceo" className="ceo" aria-current={selected === "ceo" ? "true" : undefined}>
            <span className="desk">CEO</span>
            <span className="node-text">
              <small>Centro de decisión</small>
              <span className="node-state">{ceo.pendingApprovals ? `${ceo.pendingApprovals} propias por aprobar` : "Brief y aprobaciones"}</span>
            </span>
          </a>
        )}
      </div>
      <div className="room-foot">
        <div><b>Acceso permanente</b><span>Tango, IQVia, Elvis, Capataz y más.</span></div>
        <div><b>Conocimiento acumulativo</b><span>Cada respuesta cita su sistema de origen.</span></div>
        <div><b>Activo propio</b><span>Los agentes quedan en Copahue.</span></div>
      </div>
    </section>
  );
}
