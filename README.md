# DnD Voices

Convierte el texto de una sesión de rol en audio con una voz por personaje.

El flujo es: pegas el texto crudo de la escena → Claude identifica quién dice qué →
ElevenLabs sintetiza cada intervención con la voz de su personaje → ffmpeg monta
todo con pausas y normaliza el resultado.

## Stack

| Pieza | Elección |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript estricto |
| Base de datos | PostgreSQL + Prisma 7 |
| Auth | better-auth (email + contraseña) con rate limit propio |
| Cola | BullMQ + Redis, con un worker aparte |
| Atribución y casting | Claude (`claude-opus-5`) con structured outputs |
| Voz | ElevenLabs (Voice Design + Text to Speech) |
| Montaje de audio | ffmpeg |
| Tests | Vitest (unitarios) + Playwright (e2e) |

## Puesta en marcha

Sólo hace falta Docker.

```bash
cp .env.example .env      # rellena ANTHROPIC_API_KEY y ELEVENLABS_API_KEY
docker compose up -d --build
```

Arranca Postgres, Redis, las migraciones, el servidor web y el worker.
La app queda en <http://localhost:3000>.

Genera el secreto de sesión con:

```bash
openssl rand -base64 32
```

### Desarrollo con recarga en caliente

Sólo la infraestructura en Docker; la app en el host. Necesitas Node 20+ y ffmpeg.

```bash
docker compose -f docker-compose.dev.yml up -d
npm install
npx prisma migrate deploy
```

Después, dos procesos:

```bash
npm run dev
```

```bash
npm run worker
```

El worker es obligatorio: sin él las voces se quedan en «asignando voz…» y los
renders no arrancan.

## Tests

```bash
npm run test              # unitarios (Vitest)
npm run test:coverage     # unitarios con cobertura
npm run test:e2e          # e2e contra `npm run dev`
npm run test:e2e:docker   # e2e contra el stack dockerizado
npm run test:e2e:ratelimit # rate limit de auth, en un stack aparte
```

Los e2e crean un usuario propio por caso para poder correr en paralelo, y todos
salen de la misma IP. Por eso `test:e2e:docker` sube `AUTH_RATE_LIMIT_MAX` a
1000: con el valor real de producción se estrangularían entre ellos.

Lanzar `playwright test` a mano contra un `docker compose up` normal falla por
ese motivo, y el error no lo deja claro. Usa los scripts.

Como consecuencia, esa suite no comprueba que el límite bloquee nada. Eso lo
cubre `test:e2e:ratelimit`, que levanta un segundo stack en el puerto 3001 con
el límite en 5, agota el alta y verifica que los cinco primeros intentos pasan
y los siguientes reciben un 429. Va en serie y sin reintentos: el contador es
por IP y vive en el servidor.

## Cómo está organizado

```
src/lib/ai/prompts/         Prompts, separados de la lógica de llamada
src/lib/ai/attribution.ts   Texto crudo → líneas atribuidas (structured output)
src/lib/ai/casting.ts       Trasfondo → brief de Voice Design o voz del pool
src/lib/tts/elevenlabs.ts   Voice Design, TTS y catálogo de voces
src/lib/audio/filter-graph.ts  Grafo de filtros de ffmpeg (puro, testeable)
src/lib/render/cache-key.ts    Clave de caché de un clip (pura, testeable)
src/lib/render/line-mapper.ts  Nombres de Claude → reparto real (pura, testeable)
src/lib/render/scene.ts     Orquesta el render de una escena
src/worker/index.ts         Consume las colas de render y de casting
```

La lógica que decide algo está en funciones puras y con tests; los módulos que
hablan con la red o el disco quedan reducidos a plomería.

## Decisiones que conviene conocer

**El texto crudo es la fuente de verdad.** Las líneas atribuidas se regeneran a
partir de él; editarlo devuelve la escena a `DRAFT` para dejar claro que hay que
volver a analizar antes de renderizar.

**Los clips se cachean por contenido.** La clave es
`hash(modelo + voiceId + idioma + texto + ajustes)`, con prefijo de longitud en
cada parte para que `("ab","c")` y `("a","bc")` no colisionen. Corregir una línea
sólo regenera ese clip: el resto sale de disco. ElevenLabs factura por carácter,
así que esto es la diferencia entre iterar y arruinarse. Cada render reporta
cuántas líneas vinieron de caché y cuántos caracteres se facturaron.

**Dos breakpoints de caché en los prompts de Claude.** Las instrucciones globales
son idénticas en toda la instancia; el roster y la ambientación son idénticos en
todas las escenas de una campaña. Sólo el texto de la escena va después del
último breakpoint. El mínimo cacheable en `claude-opus-5` son 512 tokens: hay un
test que falla si el prompt baja de ahí, porque por debajo deja de cachear en
silencio.

**Todo cliente externo se construye al primer uso.** Base de datos, auth, colas y
SDKs pasan por `lazyProxy`: `next build` evalúa cada módulo del servidor para
recolectar rutas, y un cliente construido al importar exigiría tener las
credenciales de producción durante la compilación.

**La normalización de audio se hace al final, no clip a clip.** Normalizar cada
voz por separado aplanaría justo el contraste entre un susurro y un grito.

**Dos estrategias de voz.** `DESIGNED` genera una voz única con Voice Design y
consume un slot del plan de ElevenLabs; `POOL` reutiliza una voz existente y sólo
ajusta `stability`/`similarityBoost`/`style`/`speed`. El narrador y los
protagonistas usan la primera, los secundarios la segunda: los planes limitan
cuántas voces propias puedes guardar, y varias campañas agotan la cuota rápido.

**La confianza de la atribución es honesta a propósito.** Por debajo de 0.7 la
línea se marca en ámbar para revisión manual. Un prompt que devolviera siempre
1.0 haría inútil ese aviso.

**El worker va compilado, no interpretado.** Se empaqueta con esbuild a un único
`.mjs`, así que la imagen no lleva ni `tsx` ni el binario de esbuild.

## Pendiente

- Elegir manualmente entre las previews de Voice Design (ahora se guarda la primera).
- Música y ambiente de fondo bajo la mezcla.
- Storage en S3/R2: `src/lib/storage/index.ts` está aislado para eso.
- Persistir el rate limit fuera de memoria si se escala el web a varias réplicas.
- Evaluar `eleven_v3` y el endpoint *Text to Dialogue*, que genera un único audio
  multi-voz con transiciones más naturales que concatenar clips.
