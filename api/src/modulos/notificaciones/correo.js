const escapar = (t) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Envía un correo con Resend. Sin clave configurada, el envío se simula en la consola.
async function enviarCorreo({ para, asunto, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[correo simulado] Para: ${para} | Asunto: ${asunto}`);
    return;
  }
  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CORREO_REMITENTE || 'onboarding@resend.dev',
        to: para,
        subject: asunto,
        html,
      }),
    });
    if (!respuesta.ok) console.error('No se pudo enviar el correo:', await respuesta.text());
  } catch (e) {
    // Un fallo del correo nunca debe frenar la operación principal
    console.error('No se pudo enviar el correo:', e.message);
  }
}

// HU-03, criterio 2: código de seguimiento al registrar la solicitud
export function enviarCodigoSeguimiento({ email, nombre, codigo }) {
  return enviarCorreo({
    para: email,
    asunto: `Tu solicitud de viaje: ${codigo}`,
    html: `
      <p>Hola ${escapar(nombre)}:</p>
      <p>Recibimos tu solicitud de viaje. Tu código de seguimiento es <strong>${codigo}</strong>.</p>
      <p>Con este código y tu apellido podés consultar el estado de tu solicitud en cualquier momento.</p>`,
  });
}

// HU-14, criterio 3: aviso de que la propuesta está lista
export function enviarAvisoPropuesta({ email, nombre, codigo }) {
  return enviarCorreo({
    para: email,
    asunto: `Tu propuesta de viaje está lista (${codigo})`,
    html: `
      <p>Hola ${escapar(nombre)}:</p>
      <p>Ya están listas las opciones de tu viaje.</p>
      <p>Ingresá con tu código <strong>${codigo}</strong> y tu apellido para verlas y elegir la que más te guste.</p>`,
  });
}