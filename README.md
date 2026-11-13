# Asistencia DAM

Aplicación web para llevar el control de las faltas de asistencia de 2.º de DAM en Victoria Institute of Technology (Sanlúcar de Barrameda). Hecha con React, TypeScript y Tailwind CSS.

**Autor:** Gonzalo Castellano Ruiz

> Es una herramienta personal de seguimiento. Sus cálculos son orientativos y dependen de los datos que introduzcas. No determina la pérdida de la evaluación continua: esa decisión corresponde al centro según su normativa.

## Cómo ejecutarla

Necesitas [Node.js](https://nodejs.org) 22 LTS o superior.

```bash
cd asistencia-dam
npm install
npm run dev
```

Abre la dirección que aparece en la terminal, normalmente <http://localhost:5173>.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca la aplicación en modo desarrollo |
| `npm run build` | Comprueba los tipos y genera la versión final en `dist/` |
| `npm run preview` | Sirve la versión final en <http://localhost:4173> |
| `npm run build:html` | Genera `asistencia-dam.html`, la aplicación en un solo archivo |
| `npm test` | Ejecuta las pruebas de cálculo, validación y persistencia |

Para publicarla, sube la carpeta `dist/` a cualquier hosting estático, como Netlify, Vercel o GitHub Pages. No necesita servidor ni base de datos.

## Tus datos

- **Horas totales:** solo están cargadas Desarrollo de Interfaces (210 h) y Python (105 h). Los otros siete módulos aparecen como «Faltan horas totales» y no tienen límite hasta que introduzcas sus horas, desde Asignaturas o Ajustes.
- **Faltas iniciales:** las 18 h están guardadas como un acumulado por módulo, sin fecha y sin clasificar, porque no se conocen el día ni la justificación. Puedes completarlas desde Historial. Si un acumulado corresponde a varios días, edítalo y añade el resto como faltas nuevas.
- **1 falta = 1 hora:** las faltas indicadas se interpretan como horas, ya que su suma coincide con las 18 h de ausencia.
- **Dónde se guardan:** en el `localStorage` de tu navegador. No salen de tu equipo y cada navegador o dispositivo tiene sus propios datos. Si borras los datos del sitio, los pierdes. Desde Ajustes puedes descargar y restaurar una copia.

## Cómo se calcula

```text
límite  = horas totales del módulo × porcentaje configurado
aviso   = límite × porcentaje de aviso
margen  = límite − horas que cuentan
```

| Estado | Condición |
| --- | --- |
| Faltan horas totales | El módulo no tiene horas introducidas |
| Dentro del margen | Por debajo del aviso |
| Cerca del límite | Desde el aviso hasta antes del límite |
| Límite alcanzado | Horas exactamente iguales al límite, con margen de 0 h |
| Límite superado | Horas por encima del límite |

El límite no se redondea: el 20 % de 63 h son 12,6 h, así que 13 h ya lo superan.

En Ajustes puedes cambiar:

- El porcentaje del límite (20 % por defecto).
- El porcentaje de aviso (75 % del límite por defecto).
- Si las faltas justificadas cuentan para el límite. Por defecto cuentan. Consulta qué aplica tu centro. Las faltas sin clasificar siempre cuentan, y el total del panel siempre incluye todas.
- El horario (6 h al día, 5 días a la semana). Una falta con fecha no puede superar las horas de un día.

## Mapa 3D

El panel incluye una maqueta hecha con Three.js. Cada torre es un módulo, su altura son las horas de falta y sus colores indican la justificación. El color de la baldosa indica el estado frente al límite.

- Arrastra para girar y pulsa una torre, o usa los botones de debajo, para ver el detalle.
- Si el equipo va justo, la escena baja la calidad y deja de girar sola.
- Si el navegador no permite WebGL, se muestra una gráfica de barras con los mismos datos.
- Con la opción del sistema de reducir movimiento, las animaciones se desactivan.

## Estructura

```text
src/
  lib/          Lógica sin interfaz: cálculos, fechas, validación, datos iniciales y persistencia
  state/        Estado global y guardado
  components/   Tarjetas, barras, gráficas, alertas y formulario de faltas
  views/        Panel, Asignaturas, Historial y Ajustes
```

Para cambiar los módulos o los datos iniciales, edita `src/lib/seed.ts`. Esos datos solo se usan la primera vez o al pulsar «Volver a los datos iniciales» en Ajustes.
