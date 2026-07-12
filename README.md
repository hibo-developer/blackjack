# Blackjack Game

Un juego de Blackjack (21) implementado en JavaScript puro con interfaz web.

## Características

- ✅ Juego completo de Blackjack con reglas estándar
- ✅ Interfaz visual con cartas reales
- ✅ Sistema de puntuación automático
- ✅ Turnos de jugador y crupier
- ✅ Detección de Blackjack (21 inicial)
- ✅ Validación de límites (no pasarse de 21)
- ✅ Botones interactivos (Pedir Carta, Plantarse, Doblar, Dividir, Reiniciar)
- ✅ Regla configurable para soft 17 del crupier
- ✅ Perfil de IA del crupier (Fácil, Normal, Difícil)
- ✅ Marcador de sesión (victorias, derrotas y empates)
- ✅ Historial reciente de manos
- ✅ Reparto secuencial con animación
- ✅ Reset de estadísticas e historial desde la interfaz
- ✅ Sonidos del juego (reparto jugador/crupier, victoria, derrota, empate) con opción activar/desactivar
- ✅ Control de volumen para efectos de sonido
- ✅ Selector de pack de sonido (Clasico, Suave, Retro)
- ✅ Sistema de apuestas completo (saldo, apuesta por mano, payout y validaciones)
- ✅ Botones de apuesta rápida (+10, +50, All-in)
- ✅ Diseño responsivo con Bootstrap
- ✅ Uso de Underscore.js para mezclar cartas

## Estructura del proyecto

```
assets/
├── index.html          # Página principal del juego
├── assets/
│   ├── cartas/        # Imágenes de las cartas (52 + reversos)
│   ├── css/
│   │   └── styles.css # Estilos personalizados
│   └── js/
│       ├── juego.js   # Lógica principal del juego
│       └── underscore-min.js # Biblioteca para mezclar cartas
├── test-blackjack.html # Página de pruebas
└── README.md          # Este archivo
```

## Cómo jugar

1. **Abrir el juego**: Abre `assets/index.html` en tu navegador
2. **Inicio**: El juego comienza automáticamente repartiendo 2 cartas al jugador y 1 al crupier
3. **Objetivo**: Acercarse a 21 puntos sin pasarse
4. **Turno del jugador**:
   - **Pedir Carta**: Toma una carta adicional
   - **Plantarse**: Termina tu turno y pasa al crupier
5. **Turno del crupier**: El crupier toma cartas automáticamente hasta tener 17 o más puntos
6. **Resultado**: Gana quien tenga más puntos sin pasarse de 21
7. **Reiniciar**: Comienza un nuevo juego

## Valores de las cartas

- **Cartas numéricas (2-10)**: Su valor numérico
- **Figuras (J, Q, K)**: 10 puntos
- **As (A)**: 11 puntos (o 1 en algunas variantes, esta versión usa 11)

## Reglas implementadas

- Blackjack (21 con 2 cartas) gana automáticamente
- Si el jugador se pasa de 21, pierde inmediatamente
- Doblar y dividir habilitados cuando corresponde
- El crupier aplica reglas H17/S17 según configuración
- IA de crupier con perfiles de comportamiento
- Empate si ambos tienen la misma puntuación (sin pasarse de 21)
- El marcador e historial se guardan entre recargas del navegador
- El saldo y la apuesta se guardan entre recargas del navegador

## Tecnologías utilizadas

- **HTML5**: Estructura de la página
- **CSS3**: Estilos personalizados y diseño responsivo
- **JavaScript (ES6+)**: Lógica del juego
- **Bootstrap 5**: Framework CSS para componentes y grid
- **Underscore.js 1.13.8**: Para la función `_.shuffle()` que mezcla las cartas

## Instalación y ejecución

1. Clona o descarga el proyecto
2. Abre `assets/index.html` en tu navegador web
3. ¡Comienza a jugar!

No se requiere servidor ni instalación de dependencias.

## Publicar y vender en Google Play

Esta version del proyecto ya esta preparada para empaquetarse como app Android usando Capacitor.

### 1) Preparar entorno Android

Necesitas instalar:

- Node.js (ya usado en este proyecto)
- Android Studio
- Android SDK (API reciente)
- Java 17 (recomendado por Gradle moderno)

Ademas, Gradle necesita la ruta del SDK en `android/local.properties`:

```properties
sdk.dir=C:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
```

En este repositorio ya quedaron configurados:

- `package.json` con scripts para Capacitor y build Android
- `capacitor.config.json`
- carpeta nativa `android/`

### 2) Sincronizar assets web al proyecto Android

Ejecuta en la raiz del proyecto:

```bash
npm run cap:sync
```

### 3) Abrir el proyecto Android

```bash
npm run android:open
```

Esto abre Android Studio con la carpeta `android/`.

### 4) Configurar firma de release (obligatorio)

En Android Studio:

1. Build > Generate Signed Bundle / APK
2. Selecciona Android App Bundle (AAB)
3. Crea o selecciona tu keystore
4. Guarda de forma segura el archivo keystore y contrasenas

Tambien puedes generar AAB por consola (si ya tienes firma configurada en Gradle):

```bash
npm run android:build
```

La build release esta configurada con optimizacion R8/ProGuard y `shrinkResources` para reducir tamano final.

Firma por archivo de propiedades en este proyecto:

1. Ejecuta `npm run android:signing:check` para validar prerequisitos
2. Ejecuta `npm run android:signing:setup` para crear keystore y `android/keystore.properties`
3. Ejecuta `npm run android:release:signed`

Alternativa manual:

1. Copia `android/keystore.properties.example` a `android/keystore.properties`
2. Completa tus credenciales de firma
3. Ejecuta `npm run android:build`

El resultado esperado queda en una ruta similar a:

`android/app/build/outputs/bundle/release/app-release.aab`

### 5) Crear app en Google Play Console

1. Crear cuenta de desarrollador (pago unico)
2. Crear aplicacion nueva
3. Subir el archivo `.aab`
4. Completar ficha de tienda: titulo, descripcion, icono, capturas, banner

### 6) Configuraciones obligatorias en Play Console

- `Data safety` (seguridad de datos)
- `Content rating` (clasificacion por edades)
- Politica de privacidad (URL publica)
- Paises de distribucion
- Precio o monetizacion

### 7) Monetizacion para vender

Opciones comunes:

- App de pago (precio unico)
- Gratis con anuncios
- Gratis con compras dentro de la app

Si usas compras dentro de la app o suscripciones, debes usar Google Play Billing.

### 8) Nota legal importante para Blackjack

Este proyecto esta planteado como juego de entretenimiento con saldo virtual.
Si agregas dinero real, retiros o premios canjeables, entras en politica de juegos de azar con requisitos y restricciones mucho mas estrictos segun pais.

### 9) Checklist rapido antes de publicar

- Nombre de paquete definitivo (evitar cambiarlo luego)
- Icono y splash en calidad alta
- VersionCode y VersionName actualizados
- Pruebas en canal interno/cerrado
- Sin errores criticos ni cierres inesperados
- Audio y controles funcionando en movil real

### 10) Versionado Android en este proyecto

- Archivo: `android/app/build.gradle`
- Version actual:
   - `versionCode 2`
   - `versionName "1.0.1"`

Regla recomendada para nuevas subidas:

- Cada envio a Play Store debe aumentar `versionCode`.
- `versionName` es la version visible para usuarios (por ejemplo `1.0.1`, `1.1.0`, `2.0.0`).

### 11) Textos listos para Play Store

Se incluye una plantilla editable en:

- `PLAY_STORE_LISTING_ES.md`

### 12) Checklist final de release

Para no olvidar pasos de calidad, Play Console y legal:

- `GOOGLE_PLAY_RELEASE_CHECKLIST.md`

## Pruebas

Para verificar que todas las funciones del juego están operativas, abre `test-blackjack.html` en tu navegador. Esta página ejecutará pruebas automáticas de:

- Disponibilidad de Underscore.js
- Funciones principales del juego (`crearBaraja`, `pedirCarta`, `valorCarta`)
- Valores correctos de las cartas
- Creación y mezcla de la baraja

## Personalización

### Cambiar estilos
Edita `assets/assets/css/styles.css` para modificar:
- Colores del fondo y texto
- Tamaño y posición de las cartas
- Estilos de los botones

### Agregar nuevas características
Modifica `assets/assets/js/juego.js` para:
- Cambiar reglas del juego
- Agregar sonidos o animaciones
- Implementar apuestas o múltiples jugadores
- Añadir modo de dificultad

### Reemplazar imágenes de cartas
Las cartas están en `assets/assets/cartas/` en formato PNG. Cada carta sigue el patrón:
- `2C.png` = 2 de Tréboles (Clubs)
- `10H.png` = 10 de Corazones (Hearts)
- `AD.png` = As de Diamantes (Diamonds)
- `KS.png` = Rey de Picas (Spades)

## Solución de problemas

### Error: "Unexpected token 'export'"
- **Causa**: Underscore.js se está cargando como módulo ES en un script clásico
- **Solución**: Ya corregido en esta versión. El archivo `juego.js` se carga como módulo ES (`type="module"`)

### Error: "_ is not defined"
- **Causa**: Underscore no está disponible en el scope global
- **Solución**: Ya corregido. Se importa explícitamente en `juego.js`

### Las cartas no se muestran
- **Causa**: Ruta incorrecta a las imágenes
- **Solución**: Verifica que la carpeta `cartas/` contenga todas las imágenes necesarias

### Los botones no funcionan
- **Causa**: JavaScript no se está ejecutando
- **Solución**: Verifica la consola del navegador para errores y asegúrate de que `juego.js` se carga correctamente

## Mejoras futuras posibles

1. **Sistema de apuestas completo**: Fichas, banca inicial y cálculo de ganancias por mano.
2. **Múltiples jugadores en mesa**: Turnos por jugador antes del crupier.
3. **Sonidos y ambiente**: Efectos de reparto, victoria/derrota y control de volumen.
4. **Modo torneo**: Varias rondas con eliminación y tabla de posiciones.
5. **Mazos alternativos**: Temas visuales de cartas y tapete (clásico, moderno, neón, etc.).
6. **Reglas de casino ampliadas**: Seguro, rendición (surrender), y restricciones de split por tipo de carta.
7. **Modo online básico**: Partidas remotas simples para dos jugadores.

## Créditos

- **Imágenes de cartas**: Deck estándar de 52 cartas
- **Underscore.js**: Biblioteca de utilidades JavaScript
- **Bootstrap**: Framework CSS para componentes
- **Desarrollo**: Implementado como proyecto educativo de JavaScript

## Licencia

Este proyecto es de código abierto y está disponible para uso educativo y personal.

---

**¡Disfruta del juego!** 🃏