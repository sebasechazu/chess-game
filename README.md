# ♛ Chess Game

Una aplicación web de ajedrez moderna construida con Angular 18+ que te permite jugar contra la computadora o simplemente disfrutar de una partida casual.

## 🎯 ¿Qué hace esta app?

Es básicamente un juego de ajedrez completo donde puedes:
- **Jugar contra la IA**: La computadora piensa sus movimientos y te da una buena pelea
- **Arrastrar y soltar piezas**: Sistema intuitivo de drag & drop con validación visual
- **Ver el historial**: Todas tus jugadas quedan registradas en notación algebraica
- **Interfaz moderna**: Diseño limpio con animaciones suaves y responsive

La app sigue las reglas básicas del ajedrez (movimientos válidos, capturas, etc.) y tiene una IA que evalúa posiciones para elegir buenos movimientos.

## 🛠️ Stack Técnico

- **Angular 20** con Signals y programación reactiva
- **TypeScript** con tipado estricto
- **Tailwind CSS** para el diseño
- **Angular CDK** para drag & drop

## 🏗️ Arquitectura

```
src/app/
├── chess-game/           # Componente principal (smart component)
├── chess-board/          # Tablero de juego (presentational)  
├── chess-piece/          # Piezas individuales
├── helpers/              # Lógica de negocio
│   ├── chess-rules.ts    # Validación de movimientos
│   ├── chess-utils.ts    # Utilidades del tablero
│   └── interfaces.ts     # Tipos y enums
├── services/             # Servicios
│   └── chess.service.ts  # Estado del juego y IA
└── shared/               # Componentes reutilizables
    ├── header-game/      # Header con info del juego
    ├── history-game/     # Historial de movimientos  
    ├── modal-game/       # Modales de victoria/empate
    └── spinner-game/     # Loading spinner
```

### Patrones implementados:
- **Smart/Dumb Components**: Separación clara entre lógica y presentación
- **Signals**: Estado reactivo moderno de Angular
- **Two-way binding**: Comunicación fluida entre componentes
- **Service Layer**: Lógica de negocio centralizada
- **Type Safety**: TypeScript en modo estricto

## 🚀 Cómo ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start

# Compilar para producción
npm run build

# Ejecutar tests
npm test
```

La app estará disponible en `http://localhost:4200`

## 🎮 Características

- ✅ Validación de movimientos en tiempo real
- ✅ Feedback visual (casillas verdes/rojas durante el drag)
- ✅ IA con evaluación de posiciones
- ✅ Historial de movimientos con notación algebraica
- ✅ Detección de jaque mate y empate
- ✅ Animaciones suaves
- ✅ Diseño responsive

## 🧠 Selector de dificultad de la IA

Se añadió un control para ajustar la dificultad de la inteligencia artificial desde la interfaz y también por código.

- Ubicación UI: el selector aparece en el componente `app-header-game` junto a los botones de IA y reiniciar.
- Valores disponibles:
    - `1` o `"easy"` — Fácil (aleatorio entre movimientos buenos)
    - `2` o `"medium"` — Medio (elige la mejor jugada heurística)
    - `3` o `"hard"` — Difícil (minimax a profundidad corta para mirar la respuesta del rival)

Uso por código (desde cualquier componente):

```ts
// inyectar ChessService y cambiar la dificultad
constructor(private chessService: ChessService) {}

// establecer dificultad a 'hard'
this.chessService.setAiDifficulty('hard');
// o con número
this.chessService.setAiDifficulty(3);
```

Notas y consideraciones:
- Al cambiar la dificultad, el servicio limpia la cache interna de movimientos para forzar recomputo.
- El modo "hard" realiza una búsqueda adicional (minimax a profundidad 2) y puede tardar más en calcular el movimiento en máquinas lentas.
- Si quieres persistir la preferencia del usuario entre sesiones, se puede almacenar el valor en `localStorage` y restaurarlo al inicializar el servicio.

## 📝 Próximas mejoras

- [ ] Enroque (castling)
- [ ] Captura al paso (en passant)  
- [ ] Promoción de peones
- [ ] Modo multijugador local

## 🤝 Contribuir

El código está organizado para ser fácil de entender y extender. Si quieres contribuir:

1. Fork del repositorio
2. Crea una rama para tu feature
3. Mantén la consistencia de código (signals, tipos, etc.)
4. Haz un PR con una descripción clara

---

*Desarrollado con ♥ usando Angular y las mejores prácticas de desarrollo frontend*