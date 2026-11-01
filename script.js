/* Mi Historia en Variables · Entrega final.
 * Sin bibliotecas: formularios, lógica, feedback con DOM y puntos.
 * El estado vive en memoria y se reinicia al recargar.
 */
'use strict';
(() => {
  const RECOMPENSA = 100;
  const PENALIZACION = 10;
  const insignias = ['Primera variable', 'Creador de habilidades', 'Guardián del cambio'];
  const formularios = [1, 2, 3].map(numero => document.getElementById('actividad-' + numero));
  let puntos = 0;
  const completadas = new Set();
  const errores = formularios.map(() => new Set());
  const buscar = id => document.getElementById(id);

  function mostrarFeedback(indice, mensaje, tipo) {
    const salida = buscar('feedback-' + (indice + 1));
    salida.textContent = mensaje;
    salida.className = 'activity-feedback ' + tipo;
  }

  function actualizarRecorrido() {
    buscar('score').textContent = puntos;
    buscar('mission-progress').value = completadas.size;
    buscar('mission-progress').textContent = completadas.size + ' de 3';
    buscar('progress-label').textContent = completadas.size + ' de 3 misiones recuperadas';
    const rangos = ['aprendiz del Archivo', 'explorador de datos', 'creador de historias', 'Guardián o Guardiana de los Datos'];
    buscar('rank').textContent = 'Rango: ' + rangos[completadas.size];
    insignias.forEach((nombre, indice) => {
      const lista = completadas.has(indice);
      buscar('badge-' + (indice + 1)).textContent = (lista ? '✦ ' : '◇ ') + nombre + (lista ? ' · recuperada' : ' · pendiente');
      buscar('badge-' + (indice + 1)).classList.toggle('earned', lista);
      buscar('reward-state-' + (indice + 1)).textContent = lista ? '¡Insignia recuperada!' : 'Insignia pendiente.';
      document.querySelectorAll('.map-card')[indice].classList.toggle('completed', lista);
    });
    buscar('journey-message').textContent = completadas.size === 3
      ? '¡Archivo restaurado! Recuperaste las tres insignias y reuniste ' + puntos + ' puntos. Ahora explicá tus descubrimientos en la bitácora.'
      : completadas.size + ' de 3 fichas recuperadas. Tenés ' + puntos + ' puntos. Las pistas te ayudan a seguir explorando.';
  }

  function validarCampos(formulario, indice) {
    const controles = [...formulario.querySelectorAll('input, select')];
    controles.forEach(control => control.removeAttribute('aria-invalid'));
    const vacios = controles.filter(control => control.type === 'radio'
      ? !formulario.querySelector('input[name="' + control.name + '"]:checked')
      : !control.value.trim());
    if (vacios.length) {
      vacios.forEach(control => control.setAttribute('aria-invalid', 'true'));
      mostrarFeedback(indice, 'Faltan datos en la ficha: completá todas las respuestas antes de comprobar. No perdiste puntos.', 'notice');
      vacios[0].focus();
      return false;
    }
    return true;
  }

  function corregirIdentidad(datos) {
    const correcta = datos.get('valor') === 'lua';
    return { correcta, mensaje: correcta
      ? '¡Primer dato recuperado! "Lúa" es el valor; nombre identifica la variable.'
      : 'Todavía falta: nombre es la etiqueta de la variable. Buscá la información que guarda.' };
  }

  function corregirTipos(datos) {
    const respuestas = { habilidad: 'texto', edad: 'numero', explorar: 'logico' };
    const pistas = { habilidad: 'La habilidad describe una acción con palabras: usá texto.', edad: 'La edad es una cantidad escrita sin comillas: usá número.', explorar: 'puedeExplorar responde verdadero o falso: usá lógico.' };
    const fallos = Object.keys(respuestas).filter(clave => datos.get(clave) !== respuestas[clave]);
    return { correcta: fallos.length === 0, mensaje: fallos.length
      ? 'Revisá la ficha. ' + fallos.map(clave => pistas[clave]).join(' ')
      : '¡Habilidades recuperadas! La descripción es texto, la edad es número y la condición es un dato lógico.' };
  }

  function corregirActualizacion(datos) {
    const edad = datos.get('nuevaEdad').trim();
    const valorCorrecto = /^\d+$/.test(edad) && Number(edad) === 14;
    const cambioCorrecto = datos.get('cambio') === 'valor';
    return { correcta: valorCorrecto && cambioCorrecto, mensaje: valorCorrecto && cambioCorrecto
      ? '¡Capítulo guardado! edad conserva su nombre y ahora guarda el valor 14.'
      : 'Revisá la actualización. ' + (!cambioCorrecto ? 'El nombre edad se mantiene; cambia su valor. ' : '') + (!valorCorrecto ? 'Sumá un año a 13 y escribí el resultado con cifras, sin comillas.' : '') };
  }

  const correcciones = [corregirIdentidad, corregirTipos, corregirActualizacion];
  function comprobarMision(evento, indice) {
    evento.preventDefault(); // La corrección no recarga la página.
    if (completadas.has(indice)) return; // Una misión suma puntos una sola vez.
    const formulario = formularios[indice];
    if (!validarCampos(formulario, indice)) return;
    const datos = new FormData(formulario);
    const resultado = correcciones[indice](datos);
    if (resultado.correcta) {
      puntos += RECOMPENSA;
      completadas.add(indice);
      mostrarFeedback(indice, resultado.mensaje + ' +100 puntos. Insignia: ' + insignias[indice] + '.', 'success');
      formulario.querySelector('fieldset').disabled = true;
      const boton = formulario.querySelector('button[type="submit"]');
      boton.textContent = 'Misión recuperada ✓';
      boton.setAttribute('aria-disabled', 'true');
    } else {
      // Una combinación equivocada ya enviada no vuelve a descontar.
      const firma = JSON.stringify([...datos.entries()].map(([clave, valor]) => [clave, valor.trim().toLowerCase()]));
      const repetido = errores[indice].has(firma);
      const descuento = repetido ? 0 : Math.min(PENALIZACION, puntos);
      puntos -= descuento;
      errores[indice].add(firma);
      const cambio = repetido ? ' Ya probaste esta respuesta: no se descuentan más puntos.'
        : descuento ? ' −' + descuento + ' puntos.' : ' Tu puntaje sigue en 0; nunca baja de cero.';
      mostrarFeedback(indice, resultado.mensaje + cambio + ' Podés usar la pista y volver a intentarlo.', 'retry');
    }
    actualizarRecorrido();
  }

  function reiniciarAventura() {
    puntos = 0;
    completadas.clear();
    errores.forEach(registro => registro.clear());
    const etiquetas = ['Comprobar respuesta →', 'Comprobar tipos →', 'Guardar actualización →'];
    formularios.forEach((formulario, indice) => {
      formulario.reset();
      formulario.querySelector('fieldset').disabled = false;
      formulario.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
      const boton = formulario.querySelector('button[type="submit"]');
      boton.removeAttribute('aria-disabled');
      boton.textContent = etiquetas[indice];
      mostrarFeedback(indice, '', '');
    });
    buscar('autoevaluacion').reset();
    document.querySelectorAll('.hint').forEach(pista => { pista.open = false; });
    actualizarRecorrido();
    buscar('journey-message').textContent = 'Nueva aventura: 0 puntos y tres fichas por recuperar. ¡El Archivo vuelve a contar contigo!';
    cerrarReinicio();
  }

  function cerrarReinicio() {
    buscar('reset-confirm').hidden = true;
    buscar('reset-start').hidden = false;
    buscar('reset-start').focus();
  }
  formularios.forEach((formulario, indice) => {
    formulario.addEventListener('submit', evento => comprobarMision(evento, indice));
    formulario.addEventListener('input', () => {
      if (completadas.has(indice)) return;
      formulario.querySelectorAll('[aria-invalid]').forEach(control => control.removeAttribute('aria-invalid'));
      mostrarFeedback(indice, 'Ficha modificada. Comprobá tu nueva respuesta cuando esté lista.', 'notice');
    });
  });
  buscar('autoevaluacion').addEventListener('submit', evento => evento.preventDefault());
  buscar('reset-start').addEventListener('click', () => {
    buscar('reset-confirm').hidden = false;
    buscar('reset-start').hidden = true;
    buscar('reset-cancel').focus();
  });
  buscar('reset-cancel').addEventListener('click', cerrarReinicio);
  buscar('reset-confirm-button').addEventListener('click', reiniciarAventura);
})();
